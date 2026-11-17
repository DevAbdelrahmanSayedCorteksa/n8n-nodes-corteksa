import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { recordLocator } from '../../shared/descriptions';
import { optionIdOf } from '../../shared/fields';
import type { Shaper } from '../../shared/output';
import { collectionOf, textOf, withJsonBody } from '../../shared/parameters';
import { fetchFields } from '../../../shared/records';
import { corteksaApiRequest, recordUrl, workspaceOf } from '../../../shared/transport';
import { asObject, asObjects, asText } from '../../../shared/values';

const show = { resource: ['record'], operation: ['move'] };

const MULTI_TYPES = new Set(['multi_select', 'tag', 'source_name']);

export const recordMoveDescription: INodeProperties[] = [
	recordLocator(show),
	{
		displayName: 'Target Unit Name or ID',
		name: 'targetUnit',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getUnits' },
		default: '',
		description:
			'The unit to move the record to. Fields are matched the way they were the last time someone moved a record between these two units in Corteksa. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'New Owner Name or ID',
				name: 'owner',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getMembers' },
				default: '',
				description:
					'Leave empty to keep the current owner. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'string',
				default: '',
				placeholder: 'e.g. Qualified lead',
				description: "Kept in the record's move history",
			},
			{
				displayName: 'Values for Required Fields',
				name: 'requiredValues',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				description:
					'Values for required fields of the target unit, used only when the record has no value that moves into them',
				options: [
					{
						displayName: 'Value',
						name: 'values',
						values: [
							{
								displayName: 'Field Name or ID',
								name: 'field',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getRequiredTargetFields',
									loadOptionsDependsOn: ['targetUnit'],
								},
								default: '',
								description:
									'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'e.g. Riyadh',
								description:
									'For a select field, the option label or its ID; for a multi-select field, labels separated by commas',
							},
						],
					},
				],
			},
		],
	},
];

async function requiredValues(
	context: IExecuteSingleFunctions,
	targetUnit: string,
	entries: IDataObject[],
): Promise<IDataObject | undefined> {
	if (entries.length === 0) {
		return undefined;
	}
	const fields = await fetchFields(context, targetUnit);
	const values: IDataObject = {};
	for (const entry of entries) {
		const slug = asText(entry.field);
		const raw = asText(entry.value) ?? '';
		const field = fields.find((candidate) => candidate.slug === slug);
		if (!slug || !field) {
			continue;
		}
		if (field.options?.values?.length) {
			const ids = raw.split(',').map((part) => optionIdOf(field, part));
			values[slug] = MULTI_TYPES.has(field.type) ? ids : ids[0];
		} else {
			values[slug] = raw;
		}
	}
	return values;
}

/** The preview resolves how fields carry over; the move then executes with that resolution. */
export async function sendRecordMove(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const unit = textOf(this, 'unit');
	const record = textOf(this, 'record');
	const targetUnit = textOf(this, 'targetUnit');
	const additional = collectionOf(this, 'additionalFields');

	const preview = await corteksaApiRequest.call(
		this,
		'POST',
		requestPath`/v2/object/data/move/${unit}/preview`,
		{
			body: { record_slug: record, target_object_slug: targetUnit, apply_preset: true },
		},
	);
	const resolutions = asObject(asObject(preview.data)?.resolutions) ?? {};
	const given = await requiredValues(
		this,
		targetUnit,
		asObjects(asObject(additional.requiredValues)?.values),
	);

	return withJsonBody(requestOptions, {
		...resolutions,
		record_slug: record,
		target_object_slug: targetUnit,
		target_required_values: given ?? resolutions.target_required_values,
		reason: asText(additional.reason),
		assign_to_admin_slug: asText(additional.owner),
	});
}

export const movedRecord: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const data = asObject(body.data) ?? {};
	const unit = asText(data.target_object_slug) ?? textOf(this, 'targetUnit');
	const id = asText(data.target_record_slug) ?? textOf(this, 'record');
	return [
		{
			id,
			unit_id: unit,
			unit_name: data.target_object_name ?? null,
			previous_id: data.source_record_slug ?? textOf(this, 'record'),
			previous_unit_id: data.source_object_slug ?? textOf(this, 'unit'),
			previous_unit_name: data.source_object_name ?? null,
			id_changed: data.slug_changed === true,
			moved_by_name: data.moved_by_name ?? null,
			record_url: recordUrl(await workspaceOf.call(this), unit, id),
		},
	];
};
