import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeProperties,
	RequestPath,
} from 'n8n-workflow';
import { NodeOperationError, requestPath } from 'n8n-workflow';
import { conversationLocator, memberLocator, simplifyParameter } from '../../shared/descriptions';
import type { Shaper } from '../../shared/output';
import { collectionOf, listOf, textOf } from '../../shared/parameters';
import { assigneeSlugs, fetchRecord } from '../../../shared/records';
import { corteksaApiRequest } from '../../../shared/transport';
import { asObject, asObjects, asText, joinNames } from '../../../shared/values';

const updateShow = { resource: ['conversation'], operation: ['update'] };
const assignShow = { resource: ['conversation'], operation: ['assign'] };
const addTagsShow = { resource: ['conversation'], operation: ['addTags'] };
const removeTagsShow = { resource: ['conversation'], operation: ['removeTags'] };

const tagsParameter = (show: { resource: string[]; operation: string[] }): INodeProperties => ({
	displayName: 'Tag Names or IDs',
	name: 'tags',
	type: 'multiOptions',
	required: true,
	typeOptions: { loadOptionsMethod: 'getChatTags' },
	default: [],
	description:
		'Conversation tags. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	displayOptions: { show },
});

export const conversationManageDescription: INodeProperties[] = [
	conversationLocator({
		resource: ['conversation'],
		operation: ['update', 'assign', 'addTags', 'removeTags'],
	}),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: updateShow },
		options: [
			{
				displayName: 'Answered',
				name: 'answered',
				type: 'boolean',
				default: true,
				description:
					'Whether your team has answered the conversation, such as after a reply sent from another tool',
			},
			{
				displayName: 'Archived',
				name: 'archived',
				type: 'boolean',
				default: true,
				description: 'Whether the conversation is archived',
			},
			{
				displayName: 'Pinned',
				name: 'pinned',
				type: 'boolean',
				default: true,
				description: 'Whether the conversation is pinned to the top of the inbox',
			},
			{
				displayName: 'Read',
				name: 'read',
				type: 'boolean',
				default: true,
				description: 'Whether the conversation is marked as read',
			},
			{
				displayName: 'Starred',
				name: 'starred',
				type: 'boolean',
				default: true,
				description: 'Whether the conversation is starred',
			},
		],
	},
	simplifyParameter(updateShow),
	{
		...memberLocator(assignShow, 'Assign To'),
		description:
			'The member who becomes the owner of the record the conversation is filed under; the current assignees are kept',
	},
	{
		...tagsParameter(addTagsShow),
		routing: { send: { type: 'body', property: 'tag_slugs' } },
	},
	tagsParameter(removeTagsShow),
];

const FLAG_PATHS: Record<string, (chat: string, on: boolean) => RequestPath> = {
	answered: (chat) => requestPath`/v2/messaging/chats/${chat}/answered`,
	archived: (chat) => requestPath`/v2/messaging/chats/${chat}/archive`,
	starred: (chat) => requestPath`/v2/messaging/chats/${chat}/star`,
	pinned: (chat) => requestPath`/v2/messaging/chats/${chat}/pin`,
	read: (chat, on) =>
		on
			? requestPath`/v1/messaging/chats/${chat}/read`
			: requestPath`/v1/messaging/chats/${chat}/unread`,
};

/** Each flag is its own endpoint (PUT sets it, DELETE clears it); the main request then reads the chat back. */
export async function sendConversationUpdate(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const chat = textOf(this, 'conversation');
	const fields = collectionOf(this, 'updateFields');
	for (const [flag, path] of Object.entries(FLAG_PATHS)) {
		const on = fields[flag];
		if (typeof on !== 'boolean') {
			continue;
		}
		const method: IHttpRequestMethods = flag === 'read' || on ? 'PUT' : 'DELETE';
		await corteksaApiRequest.call(this, method, path(chat, on), { body: {} });
	}
	return requestOptions;
}

/** A conversation's owner is the owner of the record it is filed under, so the record's assignees change. */
export async function sendConversationAssign(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const chat = await corteksaApiRequest.call(
		this,
		'GET',
		requestPath`/v1/messaging/chats/${textOf(this, 'conversation')}`,
	);
	const linked = asObject(asObject(chat.data)?.linked_record);
	const unit = asText(linked?.object_slug);
	const record = asText(linked?.record_slug);
	if (!unit || !record) {
		throw new NodeOperationError(
			this.getNode(),
			'This conversation is not filed under a record the API key can open',
			{
				description:
					'File the conversation under a contact in Corteksa first, then assign it again',
			},
		);
	}
	const current = assigneeSlugs((await fetchRecord(this, unit, record)).data);
	requestOptions.url = `/v1/object/data/${encodeURIComponent(unit)}/${encodeURIComponent(record)}/assignees`;
	requestOptions.body = { assignees: [...new Set([textOf(this, 'member'), ...current])] };
	return requestOptions;
}

/** Tags are removed one request each: the earlier ones here, the last one as the main request. */
export async function sendRemoveConversationTags(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const chat = textOf(this, 'conversation');
	const tags = listOf(this, 'tags');
	const last = tags.pop();
	if (!last) {
		throw new NodeOperationError(this.getNode(), 'No tags to remove', {
			description: "Pick at least one tag in 'Tag Names or IDs'",
		});
	}
	for (const tag of tags) {
		await corteksaApiRequest.call(
			this,
			'DELETE',
			requestPath`/v1/messaging/tags/chats/${chat}/${tag}`,
		);
	}
	requestOptions.url = `/v1/messaging/tags/chats/${encodeURIComponent(chat)}/${encodeURIComponent(last)}`;
	return requestOptions;
}

export const conversationTags: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const tags = asObjects(body.data);
	return [
		{
			id: textOf(this, 'conversation'),
			tag_ids: tags.map((tag) => tag.slug),
			tag_names: joinNames(tags, 'label'),
		},
	];
};

export const conversationOwner: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const assignees = asObjects(asObject(body.data)?.assignees);
	return [
		{
			id: textOf(this, 'conversation'),
			owner_id: assignees[0]?.slug ?? null,
			owner_name: assignees[0]?.name ?? null,
			assignee_names: joinNames(assignees),
		},
	];
};
