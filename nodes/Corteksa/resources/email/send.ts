import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { recordLocator, unitLocator } from '../../shared/descriptions';
import type { Shaper } from '../../shared/output';
import { collectionOf, textOf, withJsonBody } from '../../shared/parameters';
import { recordUrl, workspaceOf } from '../../../shared/transport';
import { asObject, asObjects, asText, joinNames } from '../../../shared/values';
import { bodyKey, mailboxParameter } from './fields';

const show = { resource: ['email'], operation: ['send'] };

export const emailSendDescription: INodeProperties[] = [
	mailboxParameter(show),
	unitLocator(show),
	recordLocator(show),
	{
		displayName: 'Content',
		name: 'content',
		type: 'options',
		options: [
			{
				name: 'Email Template',
				value: 'template',
				description: "A saved template of the unit, filled with the record's values",
			},
			{ name: 'HTML', value: 'html', description: 'A subject and an HTML body' },
			{ name: 'Plain Text', value: 'text', description: 'A subject and a plain text body' },
		],
		default: 'text',
		displayOptions: { show },
	},
	{
		displayName: 'Email Template Name or ID',
		name: 'template',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getEmailTemplates', loadOptionsDependsOn: ['unit.value'] },
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions: { show: { ...show, content: ['template'] } },
	},
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Your revised quote',
		displayOptions: { show: { ...show, content: ['html', 'text'] } },
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 5 },
		required: true,
		default: '',
		placeholder: 'e.g. Hi Sara, the revised quote is attached.',
		displayOptions: { show: { ...show, content: ['html', 'text'] } },
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
				displayName: 'Email Field Name or ID',
				name: 'emailField',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getEmailFields', loadOptionsDependsOn: ['unit.value'] },
				default: '',
				description:
					'Which email address of the record to send to, when it has more than one. Leave empty for the first one. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];

export async function sendEmail(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const content = textOf(this, 'content', 'text');
	const additional = collectionOf(this, 'additionalFields');
	const body: IDataObject = {
		mailbox_slug: textOf(this, 'mailbox'),
		object_slug: textOf(this, 'unit'),
		record_slug: textOf(this, 'record'),
		address_field: asText(additional.emailField),
	};
	if (content === 'template') {
		body.template_slug = textOf(this, 'template');
	} else {
		body.subject = textOf(this, 'subject');
		body[bodyKey(content)] = textOf(this, 'body');
	}
	return withJsonBody(requestOptions, body);
}

export const sentEmail: Shaper = async function (this: IExecuteSingleFunctions, body: IDataObject) {
	const data = asObject(body.data) ?? {};
	const unit = textOf(this, 'unit');
	const record = textOf(this, 'record');
	return [
		{
			id: data.message_slug ?? null,
			thread_id: data.thread_slug ?? null,
			queued: true,
			to_emails: joinNames(asObjects(data.to), 'email'),
			mailbox_id: data.mailbox_slug ?? textOf(this, 'mailbox'),
			unit_id: unit,
			record_id: record,
			record_url: recordUrl(await workspaceOf.call(this), unit, record),
		},
	];
};
