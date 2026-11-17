import type { IDataObject, IExecuteSingleFunctions, INodeProperties } from 'n8n-workflow';
import { recordLocator } from '../../shared/descriptions';
import { unitParameter, type Shaper } from '../../shared/output';
import { textOf } from '../../shared/parameters';
import { recordUrl, workspaceOf } from '../../../shared/transport';
import { asObject, asObjects, asText, joinNames } from '../../../shared/values';

const show = { resource: ['record'], operation: ['merge'] };

export const recordMergeDescription: INodeProperties[] = [
	{ ...recordLocator(show), displayName: 'Record to Keep' },
	{
		displayName: 'Duplicate Names or IDs',
		name: 'duplicates',
		type: 'multiOptions',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDuplicates',
			loadOptionsDependsOn: ['unit.value', 'record.value'],
		},
		default: [],
		description:
			"Duplicates to merge into 'Record to Keep'. They are deleted and this cannot be undone. Only records the unit's duplicate rule flagged can be merged, and the API key needs delete access. Choose from the list, or specify IDs using an <a href=\"https://docs.n8n.io/code/expressions/\">expression</a>.",
		displayOptions: { show },
		routing: { send: { type: 'body', property: 'source_slugs' } },
	},
];

export const mergedRecord: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const data = asObject(body.data) ?? {};
	const unit = unitParameter(this);
	const id = asText(data.survivor_slug) ?? textOf(this, 'record');
	return [
		{
			id,
			unit_id: unit,
			merged_record_ids: data.merged_slugs ?? [],
			warnings: joinNames(asObjects(data.warnings), 'message'),
			record_url: recordUrl(await workspaceOf.call(this), unit, id),
		},
	];
};
