import type { IDataObject, IExecuteSingleFunctions, INodeProperties } from 'n8n-workflow';
import { returnAllAndLimit } from '../../shared/descriptions';
import { dataList, pagePagination, respond, type Shaper } from '../../shared/output';
import { textOf } from '../../shared/parameters';
import { asObject } from '../../../shared/values';

const answerShow = { resource: ['approval'], operation: ['approve', 'reject'] };
const rejectShow = { resource: ['approval'], operation: ['reject'] };
const getManyShow = { resource: ['approval'], operation: ['getAll'] };

const answer: Shaper = async function (this: IExecuteSingleFunctions, body: IDataObject) {
	return [
		{
			id: textOf(this, 'approval'),
			decision: textOf(this, 'operation'),
			status: asObject(body.data)?.status ?? null,
		},
	];
};

export const approvalDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['approval'] } },
		options: [
			{
				name: 'Approve',
				value: 'approve',
				action: 'Approve request',
				description: 'Approve a workflow approval request that waits for you',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/workflow/approvals/{{ toPathSegment($parameter.approval) }}/approve',
						body: {},
					},
					output: { postReceive: [respond(answer)] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many approval requests',
				description: 'List the pending approval requests',
				routing: {
					request: { method: 'GET', url: '/v1/workflow/approvals' },
					output: { postReceive: [respond(dataList)] },
				},
			},
			{
				name: 'Reject',
				value: 'reject',
				action: 'Reject request',
				description: 'Reject a workflow approval request that waits for you',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/workflow/approvals/{{ toPathSegment($parameter.approval) }}/reject',
					},
					output: { postReceive: [respond(answer)] },
				},
			},
		],
		default: 'approve',
	},
	{
		displayName: 'Approval Request Name or ID',
		name: 'approval',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getApprovals' },
		default: '',
		description:
			'A request waiting for the member of the API key, such as the approval ID from a Corteksa trigger. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: answerShow },
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		default: '',
		placeholder: 'e.g. 15% is above what we can offer this quarter',
		description: 'Kept with the rejection',
		displayOptions: { show: rejectShow },
		routing: { send: { type: 'body', property: 'reason', value: '={{ $value || undefined }}' } },
	},
	{
		displayName: 'Requests',
		name: 'view',
		type: 'options',
		options: [
			{
				name: 'All Waiting',
				value: 'waiting',
				description: 'Every pending request the member of the API key can see',
			},
			{
				name: 'Waiting for Me',
				value: 'mine',
				description: 'Pending requests the member of the API key can answer',
			},
		],
		default: 'mine',
		displayOptions: { show: getManyShow },
		routing: { send: { type: 'query', property: 'view' } },
	},
	...returnAllAndLimit(getManyShow, pagePagination),
];
