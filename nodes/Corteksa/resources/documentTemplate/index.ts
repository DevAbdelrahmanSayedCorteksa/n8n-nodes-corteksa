import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { returnAllAndLimit } from '../../shared/descriptions';
import { pagePagination, respond, type Shaper } from '../../shared/output';
import { asObject, asObjects } from '../../../shared/values';

const show = { resource: ['documentTemplate'], operation: ['getAll'] };

const templates: Shaper = async (body: IDataObject) =>
	asObjects(body.data).map((template) => {
		const unit = asObject(template.object);
		return {
			id: template.slug,
			name: template.name,
			category: template.category,
			unit_id: unit?.slug ?? null,
			unit_name: unit?.name ?? null,
			updated_at: template.updated_at,
		};
	});

export const documentTemplateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['documentTemplate'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many document templates',
				description: 'List the document templates, such as quotes and contracts',
				routing: {
					request: { method: 'GET', url: '/v2/document-templates-v2' },
					output: { postReceive: [respond(templates)] },
				},
			},
		],
		default: 'getAll',
	},
	...returnAllAndLimit(show, pagePagination),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Name Contains',
				name: 'search',
				type: 'string',
				default: '',
				placeholder: 'e.g. Service agreement',
				routing: { send: { type: 'query', property: 'search' } },
			},
			{
				displayName: 'Unit Name or ID',
				name: 'unit',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getUnits' },
				default: '',
				description:
					'Only templates of this unit. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				routing: { send: { type: 'query', property: 'objectSlug' } },
			},
		],
	},
];
