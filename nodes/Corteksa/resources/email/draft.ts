import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import type { Shaper } from '../../shared/output';
import { collectionOf, textOf, withJsonBody } from '../../shared/parameters';
import { asObject, asObjects, asText, joinNames } from '../../../shared/values';
import { bodyFormatOption, bodyKey, mailboxParameter, recipients } from './fields';

const show = { resource: ['email'], operation: ['createDraft'] };

export const emailDraftDescription: INodeProperties[] = [
	{
		...mailboxParameter(show),
		description:
			'The mailbox the draft belongs to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				displayName: 'BCC',
				name: 'bcc',
				type: 'string',
				default: '',
				placeholder: 'e.g. archive@example.com',
				description: 'Email addresses separated by commas',
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				placeholder: 'e.g. Hi Sara, the revised quote is attached.',
			},
			bodyFormatOption,
			{
				displayName: 'CC',
				name: 'cc',
				type: 'string',
				default: '',
				placeholder: 'e.g. manager@example.com',
				description: 'Email addresses separated by commas',
			},
			{
				displayName: 'Reply To Email ID',
				name: 'replyTo',
				type: 'string',
				default: '',
				placeholder: 'e.g. 7b1c0e9d2f44',
				description: 'An email to draft a reply to, in its thread',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				placeholder: 'e.g. Your revised quote',
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: 'e.g. sara@example.com',
				description: 'Email addresses separated by commas',
			},
		],
	},
];

export async function sendEmailDraft(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additional = collectionOf(this, 'additionalFields');
	return withJsonBody(requestOptions, {
		account_slug: textOf(this, 'mailbox'),
		reply_to_message_slug: asText(additional.replyTo),
		to: recipients(additional.to),
		cc: recipients(additional.cc),
		bcc: recipients(additional.bcc),
		subject: asText(additional.subject),
		[bodyKey(additional.bodyFormat)]: asText(additional.body),
	});
}

export const createdDraft: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const data = asObject(body.data) ?? {};
	return [
		{
			id: data.slug ?? null,
			thread_id: data.thread_slug ?? null,
			subject: data.subject ?? null,
			to_emails: joinNames(asObjects(data.to_recipients), 'email'),
			created_at: data.created_at ?? null,
		},
	];
};
