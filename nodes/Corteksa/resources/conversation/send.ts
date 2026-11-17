import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	conversationLocator,
	messageTemplateLocator,
	recordLocator,
	unitLocator,
} from '../../shared/descriptions';
import type { Shaper } from '../../shared/output';
import { collectionOf, textOf, withJsonBody } from '../../shared/parameters';
import { asObject, asObjects, asText } from '../../../shared/values';

const messageShow = { resource: ['conversation'], operation: ['sendMessage'] };
const whatsAppShow = { resource: ['conversation'], operation: ['sendWhatsAppMessage'] };
const templateShow = { resource: ['conversation'], operation: ['sendWhatsAppTemplate'] };
const pollShow = { resource: ['conversation'], operation: ['sendWhatsAppPoll'] };
const toRecordShow = {
	resource: ['conversation'],
	operation: ['sendWhatsAppMessage', 'sendWhatsAppTemplate'],
};

const POLL_OPTIONS_MIN = 2;
const POLL_OPTIONS_MAX = 12;

const messageParameter = (show: { resource: string[]; operation: string[] }): INodeProperties => ({
	displayName: 'Message',
	name: 'message',
	type: 'string',
	typeOptions: { rows: 3 },
	required: true,
	default: '',
	placeholder: 'e.g. Your quote is ready',
	description: 'The text to send',
	displayOptions: { show },
});

export const conversationSendDescription: INodeProperties[] = [
	conversationLocator({
		resource: ['conversation'],
		operation: ['sendMessage', 'sendWhatsAppPoll'],
	}),
	{
		...messageParameter(messageShow),
		routing: { send: { type: 'body', property: 'body' } },
	},
	{
		displayName: 'WhatsApp Number Name or ID',
		name: 'channel',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getWhatsAppChannels' },
		default: '',
		description:
			'The connected WhatsApp number to send from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: toRecordShow },
	},
	messageTemplateLocator(templateShow),
	unitLocator(toRecordShow),
	recordLocator(toRecordShow),
	messageParameter(whatsAppShow),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: toRecordShow },
		options: [
			{
				displayName: 'Phone Field Name or ID',
				name: 'phoneField',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPhoneFields', loadOptionsDependsOn: ['unit.value'] },
				default: '',
				description:
					'Which phone number of the record to message, when it has more than one. Leave empty for the first one. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Template Values',
				name: 'templateValues',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				description:
					"Values for the template's variables. A variable left out is filled from the record.",
				displayOptions: { show: { '/operation': ['sendWhatsAppTemplate'] } },
				options: [
					{
						displayName: 'Value',
						name: 'values',
						values: [
							{
								displayName: 'Variable Name or ID',
								name: 'name',
								type: 'options',
								typeOptions: {
									loadOptionsMethod: 'getTemplateVariables',
									loadOptionsDependsOn: ['template.value'],
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
								placeholder: 'e.g. Sunday 10:00',
							},
						],
					},
				],
			},
		],
	},
	{
		displayName: 'Question',
		name: 'question',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Which day suits you?',
		description: 'Up to 255 characters',
		displayOptions: { show: pollShow },
		routing: { send: { type: 'body', property: 'question' } },
	},
	{
		displayName: 'Options',
		name: 'pollOptions',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		required: true,
		default: {},
		placeholder: 'Add Option',
		description: '2 to 12 different answers',
		displayOptions: { show: pollShow },
		options: [
			{
				displayName: 'Option',
				name: 'options',
				values: [
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						default: '',
						placeholder: 'e.g. Sunday',
					},
				],
			},
		],
	},
	{
		displayName: 'Allow Multiple Answers',
		name: 'multipleAnswers',
		type: 'boolean',
		default: false,
		description: 'Whether a contact can pick more than one option',
		displayOptions: { show: pollShow },
		routing: { send: { type: 'body', property: 'multiple_answers' } },
	},
];

/** Sending to a record starts a chat on the chosen number, or continues the open one. */
export async function sendToRecord(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additional = collectionOf(this, 'additionalFields');
	const isTemplate = textOf(this, 'operation') === 'sendWhatsAppTemplate';
	const templateValues: IDataObject = {};
	for (const entry of asObjects(asObject(additional.templateValues)?.values)) {
		const name = asText(entry.name);
		if (name) {
			templateValues[name] = asText(entry.value) ?? '';
		}
	}
	return withJsonBody(requestOptions, {
		object_slug: textOf(this, 'unit'),
		record_slug: textOf(this, 'record'),
		address_field: asText(additional.phoneField),
		body: isTemplate ? undefined : textOf(this, 'message'),
		template_slug: isTemplate ? textOf(this, 'template') : undefined,
		template_values: isTemplate && Object.keys(templateValues).length ? templateValues : undefined,
	});
}

export async function sendPoll(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const options = asObjects(asObject(this.getNodeParameter('pollOptions', {}))?.options)
		.map((option) => (asText(option.text) ?? '').trim())
		.filter((text) => text !== '');
	if (options.length < POLL_OPTIONS_MIN || options.length > POLL_OPTIONS_MAX) {
		throw new NodeOperationError(
			this.getNode(),
			`A poll needs ${POLL_OPTIONS_MIN} to ${POLL_OPTIONS_MAX} options`,
			{
				description: `Add between ${POLL_OPTIONS_MIN} and ${POLL_OPTIONS_MAX} entries under 'Options'; this poll has ${options.length}`,
			},
		);
	}
	const body =
		typeof requestOptions.body === 'object' && requestOptions.body !== null
			? requestOptions.body
			: {};
	requestOptions.body = { ...body, options };
	return requestOptions;
}

export const queuedMessage: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const data = asObject(body.data) ?? {};
	const createdAt =
		typeof data.created_at === 'number' ? new Date(data.created_at).toISOString() : data.created_at;
	return [
		{
			conversation_id: textOf(this, 'conversation'),
			queued: data.success ?? true,
			queued_at: createdAt ?? null,
			sent_by: data.admin ?? null,
		},
	];
};

export const recordMessage: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const data = asObject(body.data) ?? {};
	return [
		{
			conversation_id: data.chat_slug ?? null,
			started_new_conversation: data.started === true,
			channel_id: textOf(this, 'channel'),
			unit_id: textOf(this, 'unit'),
			record_id: textOf(this, 'record'),
			...(textOf(this, 'operation') === 'sendWhatsAppTemplate'
				? { template_id: textOf(this, 'template') }
				: {}),
		},
	];
};

export const sentPoll: Shaper = async function (this: IExecuteSingleFunctions, body: IDataObject) {
	const data = asObject(body.data) ?? {};
	return [
		{
			id: data.slug ?? null,
			conversation_id: textOf(this, 'conversation'),
			question: textOf(this, 'question'),
		},
	];
};
