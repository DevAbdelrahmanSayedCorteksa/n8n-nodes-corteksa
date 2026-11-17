import type { INodeProperties } from 'n8n-workflow';
import { unitLocator } from '../../shared/descriptions';
import { deletedResult, respond } from '../../shared/output';
import { commentFields, comments } from './fields';

const THREAD_URL =
	'=/v1/comments/{{ toPathSegment($parameter.unit) }}/{{ toPathSegment($parameter.record) }}';
const COMMENT_URL = `${THREAD_URL}/{{ toPathSegment($parameter.comment) }}`;

export const commentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['comment'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create comment',
				description: 'Add a comment to a record',
				routing: {
					request: { method: 'POST', url: THREAD_URL },
					output: { postReceive: [respond(comments)] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete comment',
				description: 'Delete a comment and its replies',
				routing: {
					request: { method: 'DELETE', url: COMMENT_URL },
					output: { postReceive: [respond(deletedResult)] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many comments',
				description: 'List the comments of a record',
				routing: {
					request: { method: 'GET', url: THREAD_URL },
					output: { postReceive: [respond(comments)] },
				},
			},
			{
				name: 'Reply',
				value: 'reply',
				action: 'Reply to comment',
				description: 'Reply to a comment on a record',
				routing: {
					request: { method: 'POST', url: `${COMMENT_URL}/reply` },
					output: { postReceive: [respond(comments)] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update comment',
				description: 'Replace the text of a comment',
				routing: {
					request: { method: 'PUT', url: COMMENT_URL },
					output: { postReceive: [respond(comments)] },
				},
			},
		],
		default: 'create',
	},
	unitLocator({ resource: ['comment'] }),
	...commentFields,
];
