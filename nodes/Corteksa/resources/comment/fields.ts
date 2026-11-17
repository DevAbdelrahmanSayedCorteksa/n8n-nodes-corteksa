import type { IDataObject, IExecuteSingleFunctions, INodeProperties } from 'n8n-workflow';
import { recordLocator, returnAllAndLimit, simplifyParameter } from '../../shared/descriptions';
import { pagePagination, wantsSimple, type Shaper } from '../../shared/output';
import { asObject, asObjects } from '../../../shared/values';

type Show = { resource: string[]; operation: string[] };

const commentParameter = (show: Show, description: string): INodeProperties => ({
	displayName: 'Comment Name or ID',
	name: 'comment',
	type: 'options',
	required: true,
	typeOptions: {
		loadOptionsMethod: 'getComments',
		loadOptionsDependsOn: ['unit.value', 'record.value'],
	},
	default: '',
	description: `${description} Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>`,
	displayOptions: { show },
});

const textParameter = (show: Show, displayName: string, description: string): INodeProperties => ({
	displayName,
	name: 'text',
	type: 'string',
	typeOptions: { rows: 3 },
	required: true,
	default: '',
	placeholder: 'e.g. Sent the revised quote',
	description,
	displayOptions: { show },
	routing: { send: { type: 'body', property: 'description' } },
});

const mentionsParameter = (show: Show): INodeProperties => ({
	displayName: 'Additional Fields',
	name: 'additionalFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	displayOptions: { show },
	options: [
		{
			displayName: 'Mention Names or IDs',
			name: 'mentions',
			type: 'multiOptions',
			typeOptions: { loadOptionsMethod: 'getMembers', loadOptionsDependsOn: ['unit.value'] },
			default: [],
			description:
				'Members to notify about this comment. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			routing: { send: { type: 'body', property: 'mentions' } },
		},
	],
});

const createShow = { resource: ['comment'], operation: ['create'] };
const replyShow = { resource: ['comment'], operation: ['reply'] };
const updateShow = { resource: ['comment'], operation: ['update'] };
const deleteShow = { resource: ['comment'], operation: ['delete'] };
const getManyShow = { resource: ['comment'], operation: ['getAll'] };

export const commentFields: INodeProperties[] = [
	recordLocator({ resource: ['comment'] }),
	commentParameter(replyShow, 'The comment to reply to.'),
	commentParameter(updateShow, 'The comment to change.'),
	commentParameter(
		deleteShow,
		'The comment to delete. Deleting a comment also deletes its replies and cannot be undone.',
	),
	textParameter(createShow, 'Comment', 'The text of the comment'),
	textParameter(replyShow, 'Reply', 'The text of the reply'),
	textParameter(updateShow, 'Text', 'The new text; it replaces the whole comment'),
	mentionsParameter(createShow),
	mentionsParameter(replyShow),
	...returnAllAndLimit(getManyShow, pagePagination),
	simplifyParameter({ resource: ['comment'], operation: ['create', 'reply', 'update', 'getAll'] }),
];

export function simplifyComment(comment: IDataObject): IDataObject {
	const author = asObject(comment.admin);
	return {
		id: comment.comment_slug,
		text: comment.comment_description,
		author_id: author?.slug ?? comment.admin_slug ?? null,
		author_name: author?.name ?? null,
		parent_id: comment.parent_slug ?? null,
		reply_count: comment.reply_count ?? 0,
		unit_id: comment.object_slug,
		record_id: comment.data_slug,
		created_at: comment.created_at,
		updated_at: comment.updated_at,
	};
}

export const comments: Shaper = async function (this: IExecuteSingleFunctions, body: IDataObject) {
	const rows = Array.isArray(body.data) ? asObjects(body.data) : [asObject(body.data) ?? {}];
	return wantsSimple(this) ? rows.map(simplifyComment) : rows;
};
