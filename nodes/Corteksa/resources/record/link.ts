import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError, requestPath } from 'n8n-workflow';
import { recordLocator, simplifyParameter } from '../../shared/descriptions';
import { listOf, textOf } from '../../shared/parameters';
import { fetchFields } from '../../../shared/records';
import { corteksaApiRequest, paginationOf } from '../../../shared/transport';
import { asObjects, asText } from '../../../shared/values';

const linkShow = { resource: ['record'], operation: ['link'] };
const unlinkShow = { resource: ['record'], operation: ['unlink'] };

// One page of current links is all a merge can safely rewrite: past it the PUT would drop links.
const MAX_LINKS = 200;

const relationParameters = (show: {
	resource: string[];
	operation: string[];
}): INodeProperties[] => [
	{
		displayName: 'Relation Name or ID',
		name: 'relation',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getRelations', loadOptionsDependsOn: ['unit.value'] },
		default: '',
		description:
			'The relation field of the unit. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show },
	},
	{
		displayName: 'Linked Record Names or IDs',
		name: 'linkedRecords',
		type: 'multiOptions',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getRelatedRecords',
			loadOptionsDependsOn: ['unit.value', 'relation'],
		},
		default: [],
		description:
			'Records of the related unit. The list shows the first 100; use an expression with record IDs for others. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show },
	},
];

export const recordLinkDescription: INodeProperties[] = [
	recordLocator(linkShow),
	...relationParameters(linkShow),
	simplifyParameter(linkShow),
];

export const recordUnlinkDescription: INodeProperties[] = [
	recordLocator(unlinkShow),
	...relationParameters(unlinkShow),
	simplifyParameter(unlinkShow),
];

async function sendLinks(
	context: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
	adding: boolean,
): Promise<IHttpRequestOptions> {
	const unit = textOf(context, 'unit');
	const record = textOf(context, 'record');
	const relation = textOf(context, 'relation');
	const chosen = listOf(context, 'linkedRecords');

	const field = (await fetchFields(context, unit)).find(
		(candidate) => candidate.slug === relation && candidate.type === 'relation',
	);
	if (!field) {
		throw new NodeOperationError(
			context.getNode(),
			'The chosen relation is not a relation of this unit',
			{
				description: "Pick 'Relation Name or ID' again from the list",
			},
		);
	}
	const page = await corteksaApiRequest.call(
		context,
		'GET',
		requestPath`/v1/object/data/${unit}/${record}/relations/${relation}`,
		{ qs: { page: 1, limit: MAX_LINKS } },
	);
	if (paginationOf(page).nextPage) {
		throw new NodeOperationError(
			context.getNode(),
			`This record has more than ${MAX_LINKS} linked records in this relation`,
			{ description: 'Change the links of this record in Corteksa instead' },
		);
	}
	const current = asObjects(page.data)
		.map((row) => asText(row.slug))
		.filter((slug): slug is string => !!slug);

	let value: string | string[] | null;
	if (field.relation_type === 'belongsTo') {
		value = adding
			? (chosen[0] ?? null)
			: chosen.includes(current[0])
				? null
				: (current[0] ?? null);
	} else {
		value = adding
			? [...new Set([...current, ...chosen])]
			: current.filter((slug) => !chosen.includes(slug));
	}
	requestOptions.body = { relations: { [relation]: value } };
	return requestOptions;
}

export async function sendLink(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	return await sendLinks(this, requestOptions, true);
}

export async function sendUnlink(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	return await sendLinks(this, requestOptions, false);
}
