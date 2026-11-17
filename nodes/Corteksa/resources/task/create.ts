import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { linkedRecordLocator, simplifyParameter, unitLocator } from '../../shared/descriptions';
import { recordWriteBody } from '../../shared/fields';
import { booleanOf, collectionOf, mapperOf, textOf, withJsonBody } from '../../shared/parameters';
import { asList } from '../../../shared/values';

const show = { resource: ['task'], operation: ['create'] };
const linkedShow = { ...show, linkToRecord: [true] };

export const taskCreateDescription: INodeProperties[] = [
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		required: true,
		description: 'Values of the new task, such as its title, status and due date',
		displayOptions: { show },
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getTaskCreateFields',
				mode: 'add',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: false,
				multiKeyMatch: false,
				supportAutoMap: false,
			},
		},
	},
	{
		displayName: 'Link to Record',
		name: 'linkToRecord',
		type: 'boolean',
		default: false,
		description: 'Whether the task is about a record, such as a call with a lead',
		displayOptions: { show },
	},
	unitLocator(linkedShow, 'linkedUnit', 'Related Unit'),
	linkedRecordLocator(linkedShow),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Assignee Names or IDs',
				name: 'assignees',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getMembers' },
				default: [],
				description:
					'Members to assign; the first one becomes the owner. Leave empty to assign the member who created the API key. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
	simplifyParameter(show),
];

export async function sendTaskCreate(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const { data, relations } = recordWriteBody(this.getNode(), mapperOf(this));
	const additional = collectionOf(this, 'additionalFields');
	const linked = booleanOf(this, 'linkToRecord');
	const body: IDataObject = {
		data,
		assignees: asList(additional.assignees),
		linked_data_slug: linked ? textOf(this, 'linkedRecord') : undefined,
		linked_object_slug: linked ? textOf(this, 'linkedUnit') : undefined,
	};
	if (Object.keys(relations).length) {
		body.relations = relations;
	}
	return withJsonBody(requestOptions, body);
}
