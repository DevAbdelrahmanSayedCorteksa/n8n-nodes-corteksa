import type {
	FieldType,
	IDataObject,
	INode,
	ResourceMapperField,
	ResourceMapperValue,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { fieldLabel, optionChoices } from '../../shared/records';
import type { CorteksaField } from '../../shared/types';
import { asList, isBlank } from '../../shared/values';

type FieldKind =
	| 'text'
	| 'number'
	| 'rating'
	| 'boolean'
	| 'date'
	| 'datetime'
	| 'location'
	| 'select'
	| 'multi'
	| 'one'
	| 'many';

const KIND_BY_TYPE: Record<string, FieldKind> = {
	text: 'text',
	long_text: 'text',
	email: 'text',
	link: 'text',
	phone: 'text',
	whatsapp_number: 'text',
	currency: 'text',
	number: 'number',
	rating: 'rating',
	boolean: 'boolean',
	date: 'date',
	start_date: 'date',
	due_date: 'date',
	datetime: 'datetime',
	location: 'location',
	select: 'select',
	status: 'select',
	priority: 'select',
	multi_select: 'multi',
	tag: 'multi',
	source_name: 'multi',
};

const MAPPER_TYPE: Record<FieldKind, FieldType> = {
	text: 'string',
	number: 'number',
	rating: 'number',
	boolean: 'boolean',
	date: 'dateTime',
	datetime: 'dateTime',
	location: 'string',
	select: 'options',
	multi: 'string',
	one: 'string',
	many: 'string',
};

export const SEARCHABLE_TYPES = new Set([...Object.keys(KIND_BY_TYPE), 'serial_number']);

function kindOf(field: CorteksaField): FieldKind | undefined {
	if (field.type === 'relation') {
		return field.relation_type === 'belongsTo' ? 'one' : 'many';
	}
	return KIND_BY_TYPE[field.type];
}

// The kind travels in the mapper ID so the write needs no second fetch of the unit's fields.
function mapperId(kind: FieldKind, slug: string): string {
	return `${kind}:${slug}`;
}

function parseMapperId(id: string): { kind: FieldKind; slug: string } | undefined {
	const separator = id.indexOf(':');
	const kind = id.slice(0, separator);
	if (separator < 1 || !Object.prototype.hasOwnProperty.call(MAPPER_TYPE, kind)) {
		return undefined;
	}
	return { kind: kind as FieldKind, slug: id.slice(separator + 1) };
}

function relationLabel(field: CorteksaField, kind: FieldKind): string {
	const target = field.target_object_name ? `${field.target_object_name} ` : '';
	return `${fieldLabel(field)} (${target}record ${kind === 'one' ? 'ID' : 'IDs'})`;
}

/** The unit's writable fields, then its relations, as resource mapper columns. */
export function mapperFields(fields: CorteksaField[], forUpdate: boolean): ResourceMapperField[] {
	const byImportance = (a: CorteksaField, b: CorteksaField) =>
		!forUpdate && Boolean(a.required) !== Boolean(b.required)
			? a.required
				? -1
				: 1
			: (a.sort_order ?? 0) - (b.sort_order ?? 0);

	const values = fields
		.filter((field) => field.type !== 'relation' && kindOf(field) !== undefined)
		.sort(byImportance);
	const relations = fields.filter((field) => field.type === 'relation');

	return [...values, ...relations].map((field) => {
		const kind = kindOf(field) as FieldKind;
		const choices = optionChoices(field);
		return {
			id: mapperId(kind, field.slug),
			displayName:
				kind === 'one' || kind === 'many' ? relationLabel(field, kind) : fieldLabel(field),
			required: !forUpdate && kind !== 'one' && kind !== 'many' && Boolean(field.required),
			defaultMatch: false,
			canBeUsedToMatch: false,
			display: true,
			type: MAPPER_TYPE[kind],
			...(choices.length ? { options: choices } : {}),
		};
	});
}

function resolveOption(
	node: INode,
	column: ResourceMapperField | undefined,
	value: string,
): string {
	const choices = column?.options ?? [];
	if (choices.length === 0 || choices.some((choice) => choice.value === value)) {
		return value;
	}
	const wanted = value.toLowerCase();
	const byName = choices.find((choice) => choice.name.toLowerCase() === wanted);
	if (byName) {
		return String(byName.value);
	}
	throw new NodeOperationError(node, `'${column?.displayName}' has no option "${value}"`, {
		description: `Use one of these labels or their IDs: ${choices.map((choice) => choice.name).join(', ')}`,
	});
}

function toNumber(node: INode, label: string, value: unknown, whole: boolean): number {
	const parsed = typeof value === 'number' ? value : Number(String(value).trim());
	if (!Number.isFinite(parsed) || (whole && !Number.isInteger(parsed))) {
		throw new NodeOperationError(node, `'${label}' must be a ${whole ? 'whole ' : ''}number`, {
			description: `Enter a number in '${label}', such as ${whole ? '4' : '1250.5'}`,
		});
	}
	return parsed;
}

function toBoolean(node: INode, label: string, value: unknown): boolean {
	if (typeof value === 'boolean') {
		return value;
	}
	const text = String(value).trim().toLowerCase();
	if (['true', 'yes', '1'].includes(text)) {
		return true;
	}
	if (['false', 'no', '0'].includes(text)) {
		return false;
	}
	throw new NodeOperationError(node, `'${label}' must be true or false`, {
		description: `Set '${label}' to true or false instead of "${String(value)}"`,
	});
}

function toLocation(node: INode, label: string, value: unknown): IDataObject {
	const [lat, lng, ...address] = String(value)
		.split(',')
		.map((part) => part.trim());
	if (
		lat === '' ||
		lng === undefined ||
		lng === '' ||
		!Number.isFinite(Number(lat)) ||
		!Number.isFinite(Number(lng))
	) {
		throw new NodeOperationError(node, `'${label}' must be a latitude and a longitude`, {
			description: `Enter '${label}' as latitude,longitude[,address], such as 24.7136,46.6753,Riyadh`,
		});
	}
	const location: IDataObject = { lat: Number(lat), lng: Number(lng) };
	return address.length ? { ...location, address: address.join(', ') } : location;
}

export interface RecordWriteBody {
	data: IDataObject;
	relations: IDataObject;
}

/** Converts the mapped columns into Corteksa's `{ data, relations }` write shape; blank columns are left out. */
export function recordWriteBody(
	node: INode,
	mapper: ResourceMapperValue | undefined,
): RecordWriteBody {
	const body: RecordWriteBody = { data: {}, relations: {} };
	const columns = new Map((mapper?.schema ?? []).map((column) => [column.id, column]));

	for (const [id, value] of Object.entries(mapper?.value ?? {})) {
		const parsed = parseMapperId(id);
		if (!parsed || isBlank(value)) {
			continue;
		}
		const column = columns.get(id);
		const label = column?.displayName ?? parsed.slug;
		const { kind, slug } = parsed;

		switch (kind) {
			case 'one':
				body.relations[slug] = asList(value)[0];
				break;
			case 'many':
				body.relations[slug] = asList(value);
				break;
			case 'number':
				body.data[slug] = toNumber(node, label, value, false);
				break;
			case 'rating':
				body.data[slug] = toNumber(node, label, value, true);
				break;
			case 'boolean':
				body.data[slug] = toBoolean(node, label, value);
				break;
			case 'date': {
				const text = String(value).trim();
				body.data[slug] = /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
				break;
			}
			case 'location':
				body.data[slug] = toLocation(node, label, value);
				break;
			case 'select':
				body.data[slug] = resolveOption(node, column, String(value).trim());
				break;
			case 'multi':
				body.data[slug] = asList(value).map((item) => resolveOption(node, column, item));
				break;
			default:
				body.data[slug] = String(value);
		}
	}
	return body;
}

/** The option ID of a select-like field from an ID, a label or a stored value. */
export function optionIdOf(field: CorteksaField, value: string): string {
	const wanted = value.trim().toLowerCase();
	const match = (field.options?.values ?? []).find(
		(option) =>
			option.id?.toLowerCase() === wanted ||
			option.label?.toLowerCase() === wanted ||
			option.value?.toLowerCase() === wanted,
	);
	return match?.id ?? value.trim();
}
