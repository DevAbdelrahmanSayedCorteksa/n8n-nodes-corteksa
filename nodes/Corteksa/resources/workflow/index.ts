import type { IDataObject, IExecuteSingleFunctions, INodeProperties } from 'n8n-workflow';
import { returnAllAndLimit, simplifyParameter, workflowLocator } from '../../shared/descriptions';
import { pagePagination, respond, wantsSimple, type Shaper } from '../../shared/output';
import { asObject, asObjects } from '../../../shared/values';
import { retriedRun, sendWorkflowRun, startedRun, workflowRunDescription } from './run';

const retryShow = { resource: ['workflow'], operation: ['retryRun'] };
const getManyShow = { resource: ['workflow'], operation: ['getAll'] };

function simplifyWorkflow(workflow: IDataObject): IDataObject {
	const lastRun = asObject(workflow.last_run);
	return {
		id: workflow.slug,
		name: workflow.name,
		is_active: workflow.is_active === true,
		status: workflow.status,
		trigger_type: workflow.trigger_type,
		run_count: workflow.execution_count ?? 0,
		last_run_at: workflow.last_executed_at ?? null,
		last_run_status: lastRun?.status ?? null,
		pending_approvals: workflow.pending_approvals ?? 0,
		updated_at: workflow.updated_at,
	};
}

const workflows: Shaper = async function (this: IExecuteSingleFunctions, body: IDataObject) {
	const rows = asObjects(body.data);
	return wantsSimple(this) ? rows.map(simplifyWorkflow) : rows;
};

export const workflowDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['workflow'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many workflows',
				description: 'List the Corteksa workflows',
				routing: {
					request: { method: 'GET', url: '/v1/workflow' },
					output: { postReceive: [respond(workflows)] },
				},
			},
			{
				name: 'Retry Run',
				value: 'retryRun',
				action: 'Retry workflow run',
				description: 'Run a failed run of a workflow again',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/workflow/{{ toPathSegment($parameter.workflow) }}/retry/{{ toPathSegment($parameter.runId) }}',
						body: {},
					},
					output: { postReceive: [respond(retriedRun)] },
				},
			},
			{
				name: 'Run',
				value: 'run',
				action: 'Run workflow',
				description: 'Start a workflow that has an API or webhook trigger',
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/workflow/{{ toPathSegment($parameter.workflow) }}/runs',
					},
					send: { preSend: [sendWorkflowRun] },
					output: { postReceive: [respond(startedRun)] },
				},
			},
		],
		default: 'run',
	},
	...workflowRunDescription,
	workflowLocator(retryShow, false),
	{
		displayName: 'Run ID',
		name: 'runId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 465b0a94ba7f',
		description: 'The run to retry, such as the run ID from a Corteksa trigger for failed runs',
		displayOptions: { show: retryShow },
	},
	...returnAllAndLimit(getManyShow, pagePagination),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: getManyShow },
		options: [
			{
				displayName: 'Is Active',
				name: 'isActive',
				type: 'boolean',
				default: true,
				description: 'Whether to return only the workflows that are on, or only those that are off',
				routing: { send: { type: 'query', property: 'is_active' } },
			},
			{
				displayName: 'Name Contains',
				name: 'search',
				type: 'string',
				default: '',
				placeholder: 'e.g. Welcome',
				routing: { send: { type: 'query', property: 'search' } },
			},
		],
	},
	simplifyParameter(getManyShow),
];
