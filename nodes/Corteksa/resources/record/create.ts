import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { recordWriteBody } from '../../shared/fields';
import { records, wantsSimple, type Shaper } from '../../shared/output';
import { collectionOf, mapperOf, withJsonBody } from '../../shared/parameters';
import { simplifyParameter } from '../../shared/descriptions';
import { asList } from '../../../shared/values';

const show = { resource: ['record'], operation: ['create'] };

export const recordCreateDescription: INodeProperties[] = [
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		noDataExpression: true,
		default: { mappingMode: 'defineBelow', value: null },
		required: true,
		description:
			'Values of the new record. Multi-select and tag fields take labels or option IDs separated by commas; relation fields take record IDs.',
		displayOptions: { show },
		typeOptions: {
			loadOptionsDependsOn: ['unit.value'],
			resourceMapper: {
				resourceMapperMethod: 'getRecordCreateFields',
				mode: 'add',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: false,
				multiKeyMatch: false,
				supportAutoMap: false,
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
				displayName: 'Assignee Names or IDs',
				name: 'assignees',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getMembers', loadOptionsDependsOn: ['unit.value'] },
				default: [],
				description:
					'Members to assign; the first one becomes the owner. Leave empty to assign the member who created the API key. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
	simplifyParameter(show),
];

export async function sendRecordCreate(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const { data, relations } = recordWriteBody(this.getNode(), mapperOf(this));
	const additional = collectionOf(this, 'additionalFields');
	const body: IDataObject = { data, assignees: asList(additional.assignees) };
	if (Object.keys(relations).length) {
		body.relations = relations;
	}
	return withJsonBody(requestOptions, body);
}

const recordData = records('data');

/** A duplicate rule may merge the new values into an existing record; the raw output says so. */
export const createdRecord: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const [record] = await recordData.call(this, body);
	if (wantsSimple(this)) {
		return [record];
	}
	return [
		{
			...record,
			deduplicated: body.deduplicated === true,
			dropped_fields: Array.isArray(body.dropped_fields) ? body.dropped_fields : [],
		},
	];
};
