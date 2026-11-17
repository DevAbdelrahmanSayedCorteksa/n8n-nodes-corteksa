import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import {
	conversationLocator,
	recordLocator,
	returnAllAndLimit,
	simplifyParameter,
	unitLocator,
} from '../../shared/descriptions';
import { conversations, pagePagination, type Shaper } from '../../shared/output';
import { CHATS_PAGE_SIZE } from '../../listSearch/searchConversations';
import { textOf } from '../../shared/parameters';
import { asObject, asObjects, asText } from '../../../shared/values';

const getShow = { resource: ['conversation'], operation: ['get'] };
const getManyShow = { resource: ['conversation'], operation: ['getAll'] };

export const conversationGetDescription: INodeProperties[] = [
	conversationLocator(getShow),
	simplifyParameter(getShow),
];

export const conversationGetManyDescription: INodeProperties[] = [
	{
		displayName: 'Filter By',
		name: 'filterBy',
		type: 'options',
		options: [
			{ name: 'None', value: 'none', description: 'Every conversation the API key can see' },
			{ name: 'Phone Number', value: 'phone', description: 'Conversations with one phone number' },
			{ name: 'Record', value: 'record', description: 'Conversations filed under one record' },
		],
		default: 'none',
		displayOptions: { show: getManyShow },
	},
	{
		displayName: 'Phone Number',
		name: 'phone',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. +966 50 123 4567',
		description: 'The phone number with its country code',
		displayOptions: { show: { ...getManyShow, filterBy: ['phone'] } },
	},
	unitLocator({ ...getManyShow, filterBy: ['record'] }),
	recordLocator({ ...getManyShow, filterBy: ['record'] }),
	...returnAllAndLimit(getManyShow, pagePagination, CHATS_PAGE_SIZE),
	simplifyParameter(getManyShow),
];

function digits(value: unknown): string {
	return (asText(value) ?? '').replace(/\D/g, '');
}

export async function sendConversationGetMany(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const filterBy = textOf(this, 'filterBy', 'none');
	if (filterBy === 'record') {
		requestOptions.url = `/v1/messaging/chats/record/${encodeURIComponent(textOf(this, 'unit'))}/${encodeURIComponent(textOf(this, 'record'))}`;
	} else if (filterBy === 'phone') {
		requestOptions.qs = { ...(requestOptions.qs ?? {}), search: digits(textOf(this, 'phone')) };
	}
	return requestOptions;
}

/** Search matches any text, so a phone filter keeps only chats whose number ends the same way. */
export const filteredConversations: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	let rows = asObjects(body.data);
	if (textOf(this, 'filterBy', 'none') === 'phone') {
		const wanted = digits(textOf(this, 'phone'));
		rows = rows.filter((chat) => {
			const phone = digits(chat.phone);
			return phone !== '' && (phone.endsWith(wanted) || wanted.endsWith(phone));
		});
	}
	return conversations(rows, this);
};

export const conversation: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	return conversations([asObject(body.data) ?? {}], this);
};
