import type { IDataObject, INodePropertyOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { corteksaApiRequest, type CorteksaContext } from './transport';
import type { CorteksaField, FieldOption } from './types';
import { asObject, asObjects, slugsOf, textsOf } from './values';

export interface FetchedRecord {
	fields: CorteksaField[];
	/** Null when the record is gone and the read asked for an empty answer instead of a 404. */
	data: IDataObject | null;
}

export interface FetchRecordOptions {
	emptyIfMissing?: boolean;
}

export function fieldsOf(value: unknown): CorteksaField[] {
	return Array.isArray(value) ? value.filter(isField) : [];
}

function isField(value: unknown): value is CorteksaField {
	const field = asObject(value);
	return typeof field?.slug === 'string' && typeof field.type === 'string';
}

export function fieldLabel(field: CorteksaField): string {
	return field.label || field.name || field.slug;
}

export function optionChoices(field: CorteksaField): INodePropertyOptions[] {
	return (field.options?.values ?? [])
		.filter((option): option is FieldOption & { id: string } => typeof option.id === 'string')
		.map((option) => ({ name: option.label || option.value || option.id, value: option.id }));
}

export async function fetchRecord(
	context: CorteksaContext,
	unit: string,
	record: string,
	options: FetchRecordOptions = {},
): Promise<FetchedRecord> {
	const body = await corteksaApiRequest.call(
		context,
		'GET',
		requestPath`/v1/object/data/${unit}/${record}`,
		options.emptyIfMissing ? { qs: { if_missing: 'empty' } } : {},
	);
	const detail = asObject(body.data) ?? {};
	return { fields: fieldsOf(detail.fields), data: asObject(detail.data) ?? null };
}

export async function fetchFields(
	context: CorteksaContext,
	unit: string,
): Promise<CorteksaField[]> {
	const body = await corteksaApiRequest.call(
		context,
		'GET',
		requestPath`/v1/object/field/active/${unit}`,
	);
	return fieldsOf(body.data);
}

/** For dropdowns, which load before a unit is chosen. */
export async function activeFields(
	context: CorteksaContext,
	unit: string,
): Promise<CorteksaField[]> {
	return unit ? await fetchFields(context, unit) : [];
}

export function assigneeSlugs(record: IDataObject | null): string[] {
	return slugsOf(asObjects(record?.assignees));
}

/** Option IDs held by a select-like value, which the API returns as `[{ id, label }]`. */
export function optionIds(value: unknown): string[] {
	return textsOf(asObjects(value), 'id');
}
