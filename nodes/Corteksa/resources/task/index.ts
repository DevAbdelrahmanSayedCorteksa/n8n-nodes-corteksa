import type { INodeProperties } from 'n8n-workflow';
import { deletedResult, respond, tasks } from '../../shared/output';
import { sendTaskCreate, taskCreateDescription } from './create';
import { taskDeleteDescription, taskGetDescription } from './get';
import { filteredTasks, sendTaskGetMany, taskGetManyDescription } from './getAll';
import { taskAfterWrite } from './shared';
import {
	sendTaskComplete,
	sendTaskReopen,
	taskCompleteDescription,
	taskReopenDescription,
} from './status';
import { sendTaskUpdate, taskUpdateDescription } from './update';

const TASK_URL = '=/v1/object/data/task/{{ toPathSegment($parameter.task) }}';

export const taskDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['task'] } },
		options: [
			{
				name: 'Complete',
				value: 'complete',
				action: 'Complete task',
				description: 'Mark a task as finished; a finished task is left as it is',
				routing: {
					request: { method: 'GET', url: TASK_URL },
					send: { preSend: [sendTaskComplete] },
					output: { postReceive: [respond(tasks)] },
				},
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create task',
				description: 'Create a task, optionally about a record',
				routing: {
					request: { method: 'POST', url: '/v1/object/data/task' },
					send: { preSend: [sendTaskCreate] },
					output: { postReceive: [respond(taskAfterWrite)] },
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete task',
				description: 'Delete a task',
				routing: {
					request: { method: 'DELETE', url: TASK_URL },
					output: { postReceive: [respond(deletedResult)] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get task',
				description: 'Get a task',
				routing: {
					request: { method: 'GET', url: TASK_URL },
					output: { postReceive: [respond(tasks)] },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many tasks',
				description: 'List open tasks, or the tasks of one record',
				routing: {
					request: { method: 'POST', url: '/v1/object/data/task/search' },
					send: { preSend: [sendTaskGetMany] },
					output: { postReceive: [respond(filteredTasks)] },
				},
			},
			{
				name: 'Reopen',
				value: 'reopen',
				action: 'Reopen task',
				description: 'Mark a finished task as open again; an open task is left as it is',
				routing: {
					request: { method: 'GET', url: TASK_URL },
					send: { preSend: [sendTaskReopen] },
					output: { postReceive: [respond(tasks)] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update task',
				description: 'Change the values of a task',
				routing: {
					request: { method: 'PUT', url: TASK_URL },
					send: { preSend: [sendTaskUpdate] },
					output: { postReceive: [respond(taskAfterWrite)] },
				},
			},
		],
		default: 'create',
	},
	...taskCompleteDescription,
	...taskCreateDescription,
	...taskDeleteDescription,
	...taskGetDescription,
	...taskGetManyDescription,
	...taskReopenDescription,
	...taskUpdateDescription,
];
