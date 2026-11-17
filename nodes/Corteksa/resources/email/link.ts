import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { recordLocator, unitLocator } from '../../shared/descriptions';
import type { Shaper } from '../../shared/output';
import { textOf, withJsonBody } from '../../shared/parameters';
import { recordUrl, workspaceOf } from '../../../shared/transport';
import { asObject } from '../../../shared/values';
import { threadParameter } from './fields';

const show = { resource: ['email'], operation: ['link'] };

export const emailLinkDescription: INodeProperties[] = [
	{
		displayName: 'Link',
		name: 'linkType',
		type: 'options',
		options: [
			{ name: 'Email Thread', value: 'thread', description: 'The whole conversation' },
			{ name: 'Single Email', value: 'message', description: 'One email of a thread' },
		],
		default: 'thread',
		displayOptions: { show },
	},
	threadParameter({ ...show, linkType: ['thread'] }, 'The thread to file under the record.'),
	{
		displayName: 'Email ID',
		name: 'message',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 7b1c0e9d2f44',
		description: 'The email to file under the record, such as the email ID from a Corteksa trigger',
		displayOptions: { show: { ...show, linkType: ['message'] } },
	},
	unitLocator(show),
	recordLocator(show),
];

export async function sendEmailLink(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const byThread = textOf(this, 'linkType', 'thread') === 'thread';
	return withJsonBody(requestOptions, {
		thread_slug: byThread ? textOf(this, 'thread') : undefined,
		message_slug: byThread ? undefined : textOf(this, 'message'),
		object_slug: textOf(this, 'unit'),
		record_slug: textOf(this, 'record'),
	});
}

export const linkedEmail: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const data = asObject(body.data) ?? {};
	const unit = textOf(this, 'unit');
	const record = textOf(this, 'record');
	return [
		{
			id: data.thread_slug ?? data.message_slug ?? null,
			thread_id: data.thread_slug ?? null,
			message_id: data.message_slug ?? null,
			unit_id: unit,
			record_id: record,
			record_url: recordUrl(await workspaceOf.call(this), unit, record),
		},
	];
};
