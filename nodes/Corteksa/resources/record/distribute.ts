import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { recordLocator } from '../../shared/descriptions';
import { unitParameter, type Shaper } from '../../shared/output';
import { booleanOf, textOf, withJsonBody } from '../../shared/parameters';
import { recordUrl, workspaceOf } from '../../../shared/transport';
import { asObject } from '../../../shared/values';

const show = { resource: ['record'], operation: ['distribute'] };

export const recordDistributeDescription: INodeProperties[] = [
	recordLocator(show),
	{
		displayName: 'Scenario or Rule Name or ID',
		name: 'distribution',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getDistributions', loadOptionsDependsOn: ['unit.value'] },
		default: '',
		description:
			'A lead distribution scenario or rule of the unit, written as scenario:ID or rule:ID. Needs the API key to have lead distribution access and assign access to the unit. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show },
	},
	{
		displayName: 'Replace Current Owner',
		name: 'forceReassign',
		type: 'boolean',
		default: false,
		description: 'Whether to hand on a record that already has an owner instead of refusing it',
		displayOptions: { show },
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		default: '',
		placeholder: 'e.g. Owner is on leave',
		description: "Kept in the record's history",
		displayOptions: { show },
	},
];

export async function sendRecordDistribute(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const [kind, ...rest] = textOf(this, 'distribution').split(':');
	const slug = rest.join(':');
	return withJsonBody(requestOptions, {
		object_slug: textOf(this, 'unit'),
		record_slug: textOf(this, 'record'),
		rule_slug: kind === 'rule' ? slug : undefined,
		scenario_slug: kind === 'scenario' ? slug : undefined,
		force_reassign: booleanOf(this, 'forceReassign'),
		reason: textOf(this, 'reason'),
	});
}

export const distributionResult: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const data = asObject(body.data) ?? {};
	const unit = unitParameter(this);
	const record = textOf(this, 'record');
	return [
		{
			id: record,
			unit_id: unit,
			owner_id: data.assigned_admin_slug ?? null,
			owner_name: data.assigned_admin_name ?? null,
			distribution_name: data.preset_name ?? null,
			distribution_method: data.distribution_method ?? null,
			fallback_used: data.fallback_used === true,
			record_url: recordUrl(await workspaceOf.call(this), unit, record),
		},
	];
};
