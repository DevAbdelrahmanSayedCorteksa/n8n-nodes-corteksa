import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import type { Shaper } from '../../shared/output';
import { collectionOf, textOf, withJsonBody } from '../../shared/parameters';
import { asObject, asObjects, asText, joinNames } from '../../../shared/values';
import { bodyFormatOption, bodyKey, threadParameter } from './fields';

const show = { resource: ['email'], operation: ['reply'] };

export const emailReplyDescription: INodeProperties[] = [
	threadParameter(show, 'The thread to reply in.'),
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 5 },
		required: true,
		default: '',
		placeholder: 'e.g. Hi Sara, the revised quote is attached.',
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
			bodyFormatOption,
			{
				displayName: 'Reply All',
				name: 'replyAll',
				type: 'boolean',
				default: false,
				description: 'Whether to reply to every recipient of the email instead of its sender only',
			},
			{
				displayName: 'Reply To Email ID',
				name: 'replyTo',
				type: 'string',
				default: '',
				placeholder: 'e.g. 7b1c0e9d2f44',
				description: 'The email to answer. Leave empty for the latest one someone else sent.',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				placeholder: 'e.g. Re: Your quote',
				description: "Leave empty for 'Re:' and the thread's subject",
			},
		],
	},
];

export async function sendEmailReply(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const additional = collectionOf(this, 'additionalFields');
	return withJsonBody(requestOptions, {
		[bodyKey(additional.bodyFormat)]: textOf(this, 'body'),
		message_slug: asText(additional.replyTo),
		subject: asText(additional.subject),
		reply_all: additional.replyAll === true,
	});
}

export const sentReply: Shaper = async function (this: IExecuteSingleFunctions, body: IDataObject) {
	const data = asObject(body.data) ?? {};
	return [
		{
			id: data.message_slug ?? null,
			thread_id: data.thread_slug ?? textOf(this, 'thread'),
			queued: true,
			to_emails: joinNames(asObjects(data.to), 'email'),
			mailbox_id: data.mailbox_slug ?? null,
		},
	];
};
