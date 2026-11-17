import type { INodeProperties } from 'n8n-workflow';
import { recordLocator } from '../../shared/descriptions';

const show = { resource: ['record'], operation: ['delete'] };

export const recordDeleteDescription: INodeProperties[] = [
	{
		...recordLocator(show),
		description: 'The record to delete. Deleting a record cannot be undone.',
	},
];
