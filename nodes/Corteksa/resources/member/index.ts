import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { returnAllAndLimit } from '../../shared/descriptions';
import { cursorPagination, respond, type Shaper } from '../../shared/output';
import { corteksaApiRequest } from '../../../shared/transport';
import { asObject, asObjects, asText, joinNames } from '../../../shared/values';

const show = { resource: ['member'], operation: ['getAll'] };

const MEMBERS_PAGE_SIZE = 50;

/**
 * The member directory needs the admin.read scope; without it the members who can be assigned
 * records of the first readable unit are the closest list the key may see.
 */
async function sendMemberGetMany(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const me = asObject((await corteksaApiRequest.call(this, 'GET', requestPath`/v1/me`)).data) ?? {};
	const scopes = Array.isArray(me.scopes) ? me.scopes : [];
	if (scopes.includes('admin.read')) {
		requestOptions.url = '/v2/admin/members';
		requestOptions.qs = { ...(requestOptions.qs ?? {}), active: true };
		return requestOptions;
	}
	const units = await corteksaApiRequest.call(this, 'GET', requestPath`/v1/object/active`);
	const unit = asText(asObjects(units.data)[0]?.slug) ?? 'task';
	requestOptions.url = `/v2/admin/select-options/${encodeURIComponent(unit)}`;
	return requestOptions;
}

const members: Shaper = async (body: IDataObject) =>
	asObjects(body.data).map((member) => ({
		id: member.slug,
		name: member.name,
		role_name: asObject(member.role)?.name ?? null,
		team_names: joinNames(asObjects(member.teams)),
		active: member.active ?? true,
	}));

export const memberDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['member'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many members',
				description: 'List the members of the workspace',
				routing: {
					request: { method: 'GET', url: '/v2/admin/members' },
					send: { preSend: [sendMemberGetMany] },
					output: { postReceive: [respond(members)] },
				},
			},
		],
		default: 'getAll',
	},
	...returnAllAndLimit(show, cursorPagination, MEMBERS_PAGE_SIZE),
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
				placeholder: 'e.g. Sara',
				routing: { send: { type: 'query', property: 'search' } },
			},
		],
	},
];
