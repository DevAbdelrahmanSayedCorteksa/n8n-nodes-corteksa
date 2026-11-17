import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { cursorPagination } from '../../shared/output';
import { returnAllAndLimit, simplifyParameter } from '../../shared/descriptions';
import { optionIdOf } from '../../shared/fields';
import { collectionOf, textOf } from '../../shared/parameters';
import { fetchFields } from '../../../shared/records';
import { asList, asText } from '../../../shared/values';

const show = { resource: ['record'], operation: ['getAll'] };

const TEXT_TYPES = new Set([
	'text',
	'long_text',
	'email',
	'link',
	'serial_number',
	'phone',
	'whatsapp_number',
]);
const PHONE_TYPES = new Set(['phone', 'whatsapp_number']);

export const recordGetManyDescription: INodeProperties[] = [
	...returnAllAndLimit(show, cursorPagination),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Assigned To Names or IDs',
				name: 'assignedTo',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getMembers', loadOptionsDependsOn: ['unit.value'] },
				default: [],
				description:
					'Only records assigned to these members. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Field Name or ID',
				name: 'field',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getSearchFields', loadOptionsDependsOn: ['unit.value'] },
				default: '',
				description:
					'Only records whose value in this field equals \'Field Value\'; text is compared ignoring letter case. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Field Value',
				name: 'value',
				type: 'string',
				default: '',
				placeholder: 'e.g. Won',
				description:
					"The value 'Field Name or ID' must equal. For a select or stage field, enter the option label or its ID.",
			},
			{
				displayName: 'Unassigned Only',
				name: 'unassigned',
				type: 'boolean',
				default: false,
				description: 'Whether to return only records that nobody is assigned to',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Order',
				name: 'sortDirection',
				type: 'options',
				options: [
					{ name: 'Newest First', value: 'DESC' },
					{ name: 'Oldest First', value: 'ASC' },
				],
				default: 'DESC',
				description: 'The order of the records by when they were created',
			},
		],
	},
	simplifyParameter(show),
];

/** Builds the v2 list query; a field filter needs the field's type to pick the operator and the option ID. */
export async function sendRecordGetMany(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const filters = collectionOf(this, 'filters');
	const options = collectionOf(this, 'options');
	const qs = { ...(requestOptions.qs ?? {}) };

	const assignedTo = asList(filters.assignedTo);
	if (assignedTo.length) {
		qs.adminSlug = assignedTo.join(',');
	}
	if (filters.unassigned === true) {
		qs.unassigned = true;
	}
	if (asText(options.sortDirection)) {
		qs.sortDirection = options.sortDirection;
	}

	const fieldSlug = asText(filters.field);
	if (fieldSlug) {
		const raw = asText(filters.value)?.trim() ?? '';
		const field = (await fetchFields(this, textOf(this, 'unit'))).find(
			(candidate) => candidate.slug === fieldSlug,
		);
		if (!field) {
			throw new NodeOperationError(
				this.getNode(),
				"The 'Field Name or ID' filter is not a field of this unit",
				{
					description: "Pick the field again from the list in 'Filters'",
				},
			);
		}
		const value = PHONE_TYPES.has(field.type)
			? raw.replace(/\D/g, '')
			: field.options?.values?.length
				? optionIdOf(field, raw)
				: raw;
		qs.filters = JSON.stringify([
			{ fieldSlug, operator: TEXT_TYPES.has(field.type) ? 'equals_ci' : 'equals', value },
		]);
	}

	requestOptions.qs = qs;
	return requestOptions;
}
