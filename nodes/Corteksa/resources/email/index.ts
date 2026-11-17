import type { INodeProperties } from 'n8n-workflow';
import { respond } from '../../shared/output';
import { createdDraft, emailDraftDescription, sendEmailDraft } from './draft';
import { emailLinkDescription, linkedEmail, sendEmailLink } from './link';
import { emailReplyDescription, sendEmailReply, sentReply } from './reply';
import { emailSendDescription, sendEmail, sentEmail } from './send';
import { emailThreads, emailThreadsDescription } from './threads';

export const emailDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['email'] } },
		options: [
			{
				name: 'Create Draft',
				value: 'createDraft',
				action: 'Create email draft',
				description: 'Save an email as a draft in a mailbox',
				routing: {
					request: { method: 'POST', url: '/v2/email/drafts' },
					send: { preSend: [sendEmailDraft] },
					output: { postReceive: [respond(createdDraft)] },
				},
			},
			{
				name: 'Get Many Threads',
				value: 'getManyThreads',
				action: 'Get many email threads of record',
				description: 'List the email threads filed under a record',
				routing: {
					request: {
						method: 'GET',
						url: '=/v2/email/threads/record/{{ toPathSegment($parameter.unit) }}/{{ toPathSegment($parameter.record) }}',
					},
					output: { postReceive: [respond(emailThreads)] },
				},
			},
			{
				name: 'Link to Record',
				value: 'link',
				action: 'Link email to record',
				description: 'File an email thread or a single email under a record',
				routing: {
					request: { method: 'POST', url: '/v2/email/crm-links' },
					send: { preSend: [sendEmailLink] },
					output: { postReceive: [respond(linkedEmail)] },
				},
			},
			{
				name: 'Reply',
				value: 'reply',
				action: 'Reply to email thread',
				description: 'Reply in an email thread',
				routing: {
					request: {
						method: 'POST',
						url: '=/v2/email/threads/{{ toPathSegment($parameter.thread) }}/reply',
					},
					send: { preSend: [sendEmailReply] },
					output: { postReceive: [respond(sentReply)] },
				},
			},
			{
				name: 'Send',
				value: 'send',
				action: 'Send email to record',
				description: "Send an email to a record's email address from a connected mailbox",
				routing: {
					request: { method: 'POST', url: '/v2/email/messages/send' },
					send: { preSend: [sendEmail] },
					output: { postReceive: [respond(sentEmail)] },
				},
			},
		],
		default: 'send',
	},
	...emailDraftDescription,
	...emailThreadsDescription,
	...emailLinkDescription,
	...emailReplyDescription,
	...emailSendDescription,
];
