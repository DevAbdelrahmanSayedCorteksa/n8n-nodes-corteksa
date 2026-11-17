import type { IDataObject, IExecuteSingleFunctions, INodeProperties } from 'n8n-workflow';
import { returnAllAndLimit } from '../../shared/descriptions';
import { respond, type Shaper } from '../../shared/output';
import { collectionOf } from '../../shared/parameters';
import { asObjects, asText, joinNames } from '../../../shared/values';

const show = { resource: ['team'], operation: ['getAll'] };

// The teams endpoint answers in one page and has no search, so the name filter runs here.
const teams: Shaper = async function (this: IExecuteSingleFunctions, body: IDataObject) {
	const name = (asText(collectionOf(this, 'filters').name) ?? '').trim().toLowerCase();
	return asObjects(body.data)
		.filter((team) => !name || (asText(team.name) ?? '').toLowerCase().includes(name))
		.map((team) => {
			const preview = asObjects(team.members_preview);
			return {
				id: team.slug,
				name: team.name,
				member_count: team.member_count ?? 0,
				member_ids: preview.map((member) => member.slug),
				member_names: joinNames(preview),
			};
		});
};

export const teamDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['team'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many teams',
				description: 'List the teams of the workspace',
				routing: {
					request: { method: 'GET', url: '/v2/admin/teams' },
					output: { postReceive: [respond(teams)] },
				},
			},
		],
		default: 'getAll',
	},
	...returnAllAndLimit(show),
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
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. Sales',
			},
		],
	},
];
