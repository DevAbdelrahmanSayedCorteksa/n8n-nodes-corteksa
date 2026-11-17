import type { INodeProperties } from 'n8n-workflow';
import { respond } from '../../shared/output';
import {
	conversation,
	conversationGetDescription,
	conversationGetManyDescription,
	filteredConversations,
	sendConversationGetMany,
} from './get';
import {
	conversationManageDescription,
	conversationOwner,
	conversationTags,
	sendConversationAssign,
	sendConversationUpdate,
	sendRemoveConversationTags,
} from './manage';
import {
	conversationSendDescription,
	queuedMessage,
	recordMessage,
	sendPoll,
	sendToRecord,
	sentPoll,
} from './send';

const CHAT_URL = '=/v1/messaging/chats/{{ toPathSegment($parameter.conversation) }}';

export const conversationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['conversation'] } },
		options: [
			{
				name: 'Add Tags',
				value: 'addTags',
				action: 'Add tags to conversation',
				description: 'Tag a conversation',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/messaging/tags/chats/{{ toPathSegment($parameter.conversation) }}',
					},
					output: { postReceive: [respond(conversationTags)] },
				},
			},
			{
				name: 'Assign',
				value: 'assign',
				action: 'Assign conversation',
				description: 'Make a member the owner of the record a conversation is filed under',
				routing: {
					request: { method: 'PATCH', url: CHAT_URL },
					send: { preSend: [sendConversationAssign] },
					output: { postReceive: [respond(conversationOwner)] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get conversation',
				description: 'Get a conversation',
				routing: {
					request: { method: 'GET', url: CHAT_URL },
					output: { postReceive: [respond(conversation)] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many conversations',
				description: 'List conversations, optionally of one phone number or one record',
				routing: {
					request: { method: 'GET', url: '/v1/messaging/chats/all' },
					send: { preSend: [sendConversationGetMany] },
					output: { postReceive: [respond(filteredConversations)] },
				},
			},
			{
				name: 'Remove Tags',
				value: 'removeTags',
				action: 'Remove tags from conversation',
				description: 'Remove tags from a conversation',
				routing: {
					request: { method: 'DELETE', url: CHAT_URL },
					send: { preSend: [sendRemoveConversationTags] },
					output: { postReceive: [respond(conversationTags)] },
				},
			},
			{
				name: 'Send Message',
				value: 'sendMessage',
				action: 'Send message in conversation',
				description: 'Send a text message in an existing conversation',
				routing: {
					request: {
						method: 'POST',
						url: '=/v2/messaging/messages/send/{{ toPathSegment($parameter.conversation) }}/text',
					},
					output: { postReceive: [respond(queuedMessage)] },
				},
			},
			{
				name: 'Send WhatsApp Message',
				value: 'sendWhatsAppMessage',
				action: 'Send message to record',
				description: "Send a WhatsApp message to a record's phone number from a connected number",
				routing: {
					request: {
						method: 'POST',
						url: '=/v2/messaging/chats/{{ toPathSegment($parameter.channel) }}',
					},
					send: { preSend: [sendToRecord] },
					output: { postReceive: [respond(recordMessage)] },
				},
			},
			{
				name: 'Send WhatsApp Poll',
				value: 'sendWhatsAppPoll',
				action: 'Send poll in conversation',
				description: 'Send a poll in a WhatsApp conversation',
				routing: {
					request: {
						method: 'POST',
						url: '=/v2/messaging/messages/{{ toPathSegment($parameter.conversation) }}/poll',
					},
					send: { preSend: [sendPoll] },
					output: { postReceive: [respond(sentPoll)] },
				},
			},
			{
				name: 'Send WhatsApp Template',
				value: 'sendWhatsAppTemplate',
				action: 'Send template to record',
				description: "Send an approved message template to a record's phone number",
				routing: {
					request: {
						method: 'POST',
						url: '=/v2/messaging/chats/{{ toPathSegment($parameter.channel) }}',
					},
					send: { preSend: [sendToRecord] },
					output: { postReceive: [respond(recordMessage)] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update conversation',
				description: 'Mark a conversation as answered, archived, starred, pinned or read',
				routing: {
					request: { method: 'GET', url: CHAT_URL },
					send: { preSend: [sendConversationUpdate] },
					output: { postReceive: [respond(conversation)] },
				},
			},
		],
		default: 'sendMessage',
	},
	...conversationGetDescription,
	...conversationGetManyDescription,
	...conversationManageDescription,
	...conversationSendDescription,
];
