import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { simplifyParameter, taskLocator } from '../../shared/descriptions';
import { fieldsOf } from '../../../shared/records';
import { textOf } from '../../shared/parameters';
import { corteksaApiRequest } from '../../../shared/transport';
import { asObject } from '../../../shared/values';
import { fetchTaskBody, isDone } from './shared';

const completeShow = { resource: ['task'], operation: ['complete'] };
const reopenShow = { resource: ['task'], operation: ['reopen'] };

export const taskCompleteDescription: INodeProperties[] = [
	taskLocator(completeShow),
	simplifyParameter(completeShow),
];

export const taskReopenDescription: INodeProperties[] = [
	taskLocator(reopenShow),
	simplifyParameter(reopenShow),
];

// The API only toggles, so the current state decides whether a toggle is needed at all.
async function toggleUnless(context: IExecuteSingleFunctions, wantDone: boolean): Promise<void> {
	const task = textOf(context, 'task');
	const detail = asObject((await fetchTaskBody(context, task)).data) ?? {};
	if (isDone(asObject(detail.data) ?? {}, fieldsOf(detail.fields)) !== wantDone) {
		await corteksaApiRequest.call(
			context,
			'PATCH',
			requestPath`/v1/object/task/${task}/toggle-status`,
			{
				body: {},
			},
		);
	}
}

export async function sendTaskComplete(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	await toggleUnless(this, true);
	return requestOptions;
}

export async function sendTaskReopen(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	await toggleUnless(this, false);
	return requestOptions;
}
