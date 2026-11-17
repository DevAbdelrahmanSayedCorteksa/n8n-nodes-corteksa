import type { IDisplayOptions, IN8nRequestOperations, INodeProperties } from 'n8n-workflow';

type Show = NonNullable<IDisplayOptions['show']>;

const SLUG_PATTERN = '^[A-Za-z0-9_.:-]+$';

function locator(
	name: string,
	displayName: string,
	description: string,
	searchListMethod: string,
	placeholder: string,
	show: Show,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description,
		displayOptions: { show },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod, searchable: true },
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder,
				validation: [
					{
						type: 'regex',
						properties: { regex: SLUG_PATTERN, errorMessage: 'Enter an ID without spaces' },
					},
				],
			},
		],
	};
}

export const unitLocator = (show: Show, name = 'unit', displayName = 'Unit'): INodeProperties =>
	locator(
		name,
		displayName,
		'The Corteksa unit, such as Leads or Deals. Only units the API key can read are listed.',
		'searchUnits',
		'e.g. 677566813032',
		show,
	);

export const recordLocator = (show: Show): INodeProperties =>
	locator(
		'record',
		'Record',
		"A record of the chosen 'Unit'",
		'searchRecords',
		'e.g. 98379c221ffe',
		show,
	);

export const linkedRecordLocator = (show: Show): INodeProperties =>
	locator(
		'linkedRecord',
		'Related Record',
		"A record of the chosen 'Related Unit'",
		'searchLinkedRecords',
		'e.g. 98379c221ffe',
		show,
	);

export const taskLocator = (show: Show): INodeProperties =>
	locator('task', 'Task', 'The task to use', 'searchTasks', 'e.g. 25a72b01983a', show);

export const memberLocator = (show: Show, displayName = 'Member'): INodeProperties =>
	locator(
		'member',
		displayName,
		'A member of the workspace',
		'searchMembers',
		'e.g. b69d704d0600',
		show,
	);

export const workflowLocator = (show: Show, startableOnly: boolean): INodeProperties =>
	locator(
		'workflow',
		'Workflow',
		startableOnly
			? 'Only workflows that are on and start from an API or webhook trigger are listed'
			: 'The Corteksa workflow to use',
		startableOnly ? 'searchStartableWorkflows' : 'searchWorkflows',
		'e.g. welcome-lead-21d55cb970f2',
		show,
	);

export const conversationLocator = (show: Show): INodeProperties =>
	locator(
		'conversation',
		'Conversation',
		'The conversation to use, such as a WhatsApp chat',
		'searchConversations',
		'e.g. chat-15-202013921001713-lid',
		show,
	);

export const messageTemplateLocator = (show: Show): INodeProperties =>
	locator(
		'template',
		'Template',
		"An active message template that the chosen 'WhatsApp Number' can send",
		'searchMessageTemplates',
		'e.g. order-ready',
		show,
	);

export const simplifyParameter = (show: Show): INodeProperties => ({
	displayName: 'Simplify',
	name: 'simplify',
	type: 'boolean',
	default: true,
	description: 'Whether to return a simplified version of the response instead of the raw data',
	displayOptions: { show },
});

/**
 * Return All and Limit for a Get Many operation. Without `pagination` the endpoint answers in one
 * page and Limit only trims the output; `pageSize` is the endpoint's largest page.
 */
export function returnAllAndLimit(
	show: Show,
	pagination?: IN8nRequestOperations['pagination'],
	pageSize = 100,
): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show },
			routing: pagination
				? {
						send: {
							paginate: '={{ $value }}',
							type: 'query',
							property: 'limit',
							value: String(pageSize),
						},
						operations: { pagination },
					}
				: undefined,
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1, maxValue: pageSize },
			description: 'Max number of results to return',
			displayOptions: { show: { ...show, returnAll: [false] } },
			routing: {
				...(pagination ? { send: { type: 'query', property: 'limit' } } : {}),
				output: { maxResults: '={{ $value }}' },
			},
		},
	];
}
