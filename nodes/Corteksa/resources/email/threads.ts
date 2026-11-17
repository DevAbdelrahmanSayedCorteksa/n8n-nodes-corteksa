import type { IDataObject, IExecuteSingleFunctions, INodeProperties } from 'n8n-workflow';
import {
	recordLocator,
	returnAllAndLimit,
	simplifyParameter,
	unitLocator,
} from '../../shared/descriptions';
import { pagePagination, wantsSimple, type Shaper } from '../../shared/output';
import { collectionOf } from '../../shared/parameters';
import { asObjects, asText, joinNames } from '../../../shared/values';

const show = { resource: ['email'], operation: ['getManyThreads'] };

export const emailThreadsDescription: INodeProperties[] = [
	unitLocator(show),
	recordLocator(show),
	...returnAllAndLimit(show, pagePagination),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Subject Contains',
				name: 'subject',
				type: 'string',
				default: '',
				placeholder: 'e.g. Renewal quote',
				description: 'Only threads whose subject contains this text',
			},
		],
	},
	simplifyParameter(show),
];

export function simplifyThread(thread: IDataObject): IDataObject {
	return {
		id: thread.slug,
		subject: thread.subject,
		snippet: thread.snippet,
		mailbox_id: thread.mailbox_slug,
		participants: joinNames(asObjects(thread.participants), 'email'),
		message_count: thread.message_count,
		is_read: thread.is_read === true,
		last_message_at: thread.last_message_at,
	};
}

export const emailThreads: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const subject = (asText(collectionOf(this, 'filters').subject) ?? '').trim().toLowerCase();
	const rows = asObjects(body.data).filter(
		(thread) => !subject || (asText(thread.subject) ?? '').toLowerCase().includes(subject),
	);
	return wantsSimple(this) ? rows.map(simplifyThread) : rows;
};
