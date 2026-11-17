import type { INodeProperties } from 'n8n-workflow';
import { unitLocator } from '../../shared/descriptions';
import { deletedResult, records, respond } from '../../shared/output';
import {
	recordAddTagsDescription,
	recordRemoveTagsDescription,
	sendAddTags,
	sendRemoveTags,
} from './tags';
import {
	assignmentResult,
	recordAssignDescription,
	recordUnassignDescription,
	sendRecordAssign,
	sendRecordUnassign,
} from './assign';
import { recordAttachFileDescription, sendAttachFile } from './attachFile';
import { createdRecord, recordCreateDescription, sendRecordCreate } from './create';
import { recordDeleteDescription } from './delete';
import {
	distributionResult,
	recordDistributeDescription,
	sendRecordDistribute,
} from './distribute';
import { recordGetDescription } from './get';
import { recordGetManyDescription, sendRecordGetMany } from './getAll';
import { recordLinkDescription, recordUnlinkDescription, sendLink, sendUnlink } from './link';
import { mergedRecord, recordMergeDescription } from './merge';
import { movedRecord, recordMoveDescription, sendRecordMove } from './move';
import { recordSearchDescription } from './search';
import { recordUpdateDescription, sendRecordUpdate } from './update';

const showOnlyForRecords = { resource: ['record'] };

const RECORD_URL =
	'=/v1/object/data/{{ toPathSegment($parameter.unit) }}/{{ toPathSegment($parameter.record) }}';

export const recordDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForRecords },
		options: [
			{
				name: 'Add Tags',
				value: 'addTags',
				action: 'Add tags to record',
				description: "Add tags to the record's Tag field, keeping the current ones",
				routing: {
					request: { method: 'PUT', url: RECORD_URL },
					send: { preSend: [sendAddTags] },
					output: { postReceive: [respond(records('data'))] },
				},
			},
			{
				name: 'Assign',
				value: 'assign',
				action: 'Assign record',
				description: 'Assign members to a record',
				routing: {
					request: { method: 'PATCH', url: `${RECORD_URL}/assignees` },
					send: { preSend: [sendRecordAssign] },
					output: { postReceive: [respond(assignmentResult)] },
				},
			},
			{
				name: 'Attach File',
				value: 'attachFile',
				action: 'Attach file to record',
				description: 'Upload a file into a file or photo field of a record',
				routing: {
					request: { method: 'PUT', url: RECORD_URL },
					send: { preSend: [sendAttachFile] },
					output: { postReceive: [respond(records('data'))] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create record',
				description: 'Create a record in a unit',
				routing: {
					request: { method: 'POST', url: '=/v1/object/data/{{ toPathSegment($parameter.unit) }}' },
					send: { preSend: [sendRecordCreate] },
					output: { postReceive: [respond(createdRecord)] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete record',
				description: 'Delete a record',
				routing: {
					request: { method: 'DELETE', url: RECORD_URL },
					output: { postReceive: [respond(deletedResult)] },
				},
			},
			{
				name: 'Distribute',
				value: 'distribute',
				action: 'Distribute record',
				description: 'Hand a record to an owner with a lead distribution scenario or rule',
				routing: {
					request: { method: 'POST', url: '/v2/lead-distribution/override' },
					send: { preSend: [sendRecordDistribute] },
					output: { postReceive: [respond(distributionResult)] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get record',
				description: 'Get a record',
				routing: {
					request: { method: 'GET', url: RECORD_URL },
					output: { postReceive: [respond(records('data.data'))] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many records',
				description:
					'List the records of a unit, optionally filtered by a field value or an assignee',
				routing: {
					request: { method: 'GET', url: '=/v2/object/data/{{ toPathSegment($parameter.unit) }}' },
					send: { preSend: [sendRecordGetMany] },
					output: { postReceive: [respond(records('data.data'))] },
				},
			},
			{
				name: 'Link',
				value: 'link',
				action: 'Link records',
				description:
					'Link records to a record through one of its relations, keeping the current links',
				routing: {
					request: { method: 'PUT', url: RECORD_URL },
					send: { preSend: [sendLink] },
					output: { postReceive: [respond(records('data'))] },
				},
			},
			{
				name: 'Merge',
				value: 'merge',
				action: 'Merge duplicate records',
				description: 'Merge flagged duplicates into a record',
				routing: {
					request: { method: 'POST', url: `${RECORD_URL}/duplicates/merge` },
					output: { postReceive: [respond(mergedRecord)] },
				},
			},
			{
				name: 'Move',
				value: 'move',
				action: 'Move record to another unit',
				description: 'Move a record to another unit, such as a lead to deals',
				routing: {
					request: {
						method: 'POST',
						url: '=/v2/object/data/move/{{ toPathSegment($parameter.unit) }}/execute',
					},
					send: { preSend: [sendRecordMove] },
					output: { postReceive: [respond(movedRecord)] },
				},
			},
			{
				name: 'Remove Tags',
				value: 'removeTags',
				action: 'Remove tags from record',
				description: "Remove tags from the record's Tag field",
				routing: {
					request: { method: 'PUT', url: RECORD_URL },
					send: { preSend: [sendRemoveTags] },
					output: { postReceive: [respond(records('data'))] },
				},
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search records',
				description:
					'Find records whose names, emails, phone numbers or other text fields contain a term',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/object/data/{{ toPathSegment($parameter.unit) }}/search',
					},
					output: { postReceive: [respond(records('data.data'))] },
				},
			},
			{
				name: 'Unassign',
				value: 'unassign',
				action: 'Unassign record',
				description: 'Remove members, or every assignee, from a record',
				routing: {
					request: { method: 'PATCH', url: `${RECORD_URL}/assignees` },
					send: { preSend: [sendRecordUnassign] },
					output: { postReceive: [respond(assignmentResult)] },
				},
			},
			{
				name: 'Unlink',
				value: 'unlink',
				action: 'Unlink records',
				description: 'Remove links between a record and other records',
				routing: {
					request: { method: 'PUT', url: RECORD_URL },
					send: { preSend: [sendUnlink] },
					output: { postReceive: [respond(records('data'))] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update record',
				description: 'Change the values of a record',
				routing: {
					request: { method: 'PUT', url: RECORD_URL },
					send: { preSend: [sendRecordUpdate] },
					output: { postReceive: [respond(records('data'))] },
				},
			},
		],
		default: 'create',
	},
	unitLocator(showOnlyForRecords),
	...recordAddTagsDescription,
	...recordAssignDescription,
	...recordAttachFileDescription,
	...recordCreateDescription,
	...recordDeleteDescription,
	...recordDistributeDescription,
	...recordGetDescription,
	...recordGetManyDescription,
	...recordLinkDescription,
	...recordMergeDescription,
	...recordMoveDescription,
	...recordRemoveTagsDescription,
	...recordSearchDescription,
	...recordUnassignDescription,
	...recordUnlinkDescription,
	...recordUpdateDescription,
];
