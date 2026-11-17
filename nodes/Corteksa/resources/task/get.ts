import type { INodeProperties } from 'n8n-workflow';
import { simplifyParameter, taskLocator } from '../../shared/descriptions';

const getShow = { resource: ['task'], operation: ['get'] };
const deleteShow = { resource: ['task'], operation: ['delete'] };

export const taskGetDescription: INodeProperties[] = [
	taskLocator(getShow),
	simplifyParameter(getShow),
];

export const taskDeleteDescription: INodeProperties[] = [
	{
		...taskLocator(deleteShow),
		description: 'The task to delete. Deleting a task cannot be undone.',
	},
];
