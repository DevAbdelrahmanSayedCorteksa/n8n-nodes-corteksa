import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { recordLocator, simplifyParameter } from '../../shared/descriptions';
import { recordWriteBody } from '../../shared/fields';
import { collectionOf, mapperOf, withJsonBody } from '../../shared/parameters';
import { asText } from '../../../shared/values';

const show = { resource: ['record'], operation: ['update'] };

export const recordUpdateDescription: INodeProperties[] = [
	recordLocator(show),
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		required: true,
		description:
			'Values to change; fields left empty keep their value. Multi-select and tag fields take labels or option IDs separated by commas; relation fields take record IDs and replace the current links.',
		displayOptions: { show },
		typeOptions: {
			loadOptionsDependsOn: ['unit.value'],
			resourceMapper: {
				resourceMapperMethod: 'getRecordUpdateFields',
				mode: 'update',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: false,
				multiKeyMatch: false,
				supportAutoMap: false,
				noFieldsError: 'This unit has no fields the API can write',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'New Owner Name or ID',
				name: 'owner',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getMembers', loadOptionsDependsOn: ['unit.value'] },
				default: '',
				description:
					'Makes this member the only assignee. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
	simplifyParameter(show),
];

export async function sendRecordUpdate(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const { data, relations } = recordWriteBody(this.getNode(), mapperOf(this));
	const additional = collectionOf(this, 'additionalFields');
	const body: IDataObject = { data, admin_slug: asText(additional.owner) };
	if (Object.keys(relations).length) {
		body.relations = relations;
	}
	return withJsonBody(requestOptions, body);
}
