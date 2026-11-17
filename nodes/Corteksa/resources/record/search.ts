import type { INodeProperties } from 'n8n-workflow';
import { pagePagination } from '../../shared/output';
import { returnAllAndLimit, simplifyParameter } from '../../shared/descriptions';

const show = { resource: ['record'], operation: ['search'] };

export const recordSearchDescription: INodeProperties[] = [
	{
		displayName: 'Search Term',
		name: 'searchTerm',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Sara',
		description:
			'Text to find in the names, emails, phone numbers and other text fields of the records',
		displayOptions: { show },
		routing: { send: { type: 'body', property: 'searchTerm', value: '={{ $value.trim() }}' } },
	},
	...returnAllAndLimit(show, pagePagination),
	simplifyParameter(show),
];
