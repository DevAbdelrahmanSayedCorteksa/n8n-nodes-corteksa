import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { recordLocator } from '../../shared/descriptions';
import { unitParameter, type Shaper } from '../../shared/output';
import { booleanOf, listOf, textOf, withJsonBody } from '../../shared/parameters';
import { assigneeSlugs, fetchRecord } from '../../../shared/records';
import { recordUrl, workspaceOf } from '../../../shared/transport';
import { asObject, asObjects, joinNames } from '../../../shared/values';

const assignShow = { resource: ['record'], operation: ['assign'] };
const unassignShow = { resource: ['record'], operation: ['unassign'] };

const MAX_ASSIGNEES = 20;

export const recordAssignDescription: INodeProperties[] = [
	recordLocator(assignShow),
	{
		displayName: 'Member Names or IDs',
		name: 'members',
		type: 'multiOptions',
		required: true,
		typeOptions: { loadOptionsMethod: 'getMembers', loadOptionsDependsOn: ['unit.value'] },
		default: [],
		description:
			'Members to assign; the first one becomes the owner. A record can have up to 20 assignees. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: assignShow },
	},
	{
		displayName: 'Keep Current Assignees',
		name: 'keepExisting',
		type: 'boolean',
		default: false,
		description: 'Whether to add these members to the current assignees instead of replacing them',
		displayOptions: { show: assignShow },
	},
];

export const recordUnassignDescription: INodeProperties[] = [
	recordLocator(unassignShow),
	{
		displayName: 'Member Names or IDs',
		name: 'members',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getMembers', loadOptionsDependsOn: ['unit.value'] },
		default: [],
		description:
			'Members to remove. Leave empty to remove every assignee. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: unassignShow },
	},
];

export async function sendRecordAssign(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const members = listOf(this, 'members');
	const current = booleanOf(this, 'keepExisting')
		? assigneeSlugs((await fetchRecord(this, textOf(this, 'unit'), textOf(this, 'record'))).data)
		: [];
	const assignees = [...new Set([...current, ...members])].slice(0, MAX_ASSIGNEES);
	return withJsonBody(requestOptions, { assignees });
}

export async function sendRecordUnassign(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const remove = new Set(listOf(this, 'members'));
	const remaining = remove.size
		? assigneeSlugs(
				(await fetchRecord(this, textOf(this, 'unit'), textOf(this, 'record'))).data,
			).filter((slug) => !remove.has(slug))
		: [];
	requestOptions.body = { assignees: remaining };
	return requestOptions;
}

export const assignmentResult: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const unit = unitParameter(this);
	const record = textOf(this, 'record');
	const assignees = asObjects(asObject(body.data)?.assignees);
	return [
		{
			id: record,
			unit_id: unit,
			owner_id: assignees[0]?.slug ?? null,
			owner_name: assignees[0]?.name ?? null,
			assignee_ids: assignees.map((assignee) => assignee.slug),
			assignee_names: joinNames(assignees),
			record_url: recordUrl(await workspaceOf.call(this), unit, record),
		},
	];
};
