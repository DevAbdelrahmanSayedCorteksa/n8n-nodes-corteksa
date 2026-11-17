import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	RequestPath,
} from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { corteksaApiRequest, paginationOf } from './transport';
import { asObjects, asText } from './values';

/** A parameter of the node being edited; empty when the current operation does not show it. */
export function textParameter(context: ILoadOptionsFunctions, name: string): string {
	const value = context.getCurrentNodeParameter(name, { extractValue: true });
	return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export function searchTerm(filter: string | undefined): string | undefined {
	const term = filter?.trim();
	return term ? term : undefined;
}

/** One page of a page-numbered Corteksa list as list-search results; the token is the next page number. */
export async function searchByPage(
	this: ILoadOptionsFunctions,
	path: RequestPath,
	qs: IDataObject,
	paginationToken: string | undefined,
	toItem: (row: IDataObject) => INodeListSearchItems | undefined,
	pageSize = 100,
): Promise<INodeListSearchResult> {
	const page = paginationToken ? Number(paginationToken) : 1;
	const body = await corteksaApiRequest.call(this, 'GET', path, {
		qs: { ...qs, page, limit: pageSize },
	});
	const results = asObjects(body.data)
		.map(toItem)
		.filter((item): item is INodeListSearchItems => item !== undefined);
	const { nextPage } = paginationOf(body);
	return { results, paginationToken: nextPage ? String(nextPage) : undefined };
}

/** A row with a slug as a list item, named by `name` or, without one, by the slug. */
export function slugItem(row: IDataObject): INodeListSearchItems | undefined {
	const slug = asText(row.slug);
	return slug ? { name: asText(row.name) || slug, value: slug } : undefined;
}

export async function searchWorkflows(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByPage.call(
		this,
		requestPath`/v1/workflow`,
		{ search: searchTerm(filter) },
		paginationToken,
		slugItem,
	);
}

/**
 * Members who can own records of the node's unit (tasks for the Task resource), or of the first
 * unit the key can read: the select-options list needs only read access, where the member
 * directory needs admin.read.
 */
export async function assignableMembersUnit(this: ILoadOptionsFunctions): Promise<string> {
	if (this.getCurrentNodeParameter('resource') === 'task') {
		return 'task';
	}
	const unit = textParameter(this, 'unit');
	if (unit) {
		return unit;
	}
	const units = await corteksaApiRequest.call(this, 'GET', requestPath`/v1/object/active`);
	return asText(asObjects(units.data)[0]?.slug) ?? 'task';
}

export async function searchMembers(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const unit = await assignableMembersUnit.call(this);
	const body = await corteksaApiRequest.call(
		this,
		'GET',
		requestPath`/v2/admin/select-options/${unit}`,
		{
			qs: { search: searchTerm(filter), limit: 50, cursor: paginationToken },
		},
	);
	const results = asObjects(body.data)
		.map(slugItem)
		.filter((item): item is INodeListSearchItems => item !== undefined);
	const { hasMore, nextCursor } = paginationOf(body);
	return { results, paginationToken: hasMore && nextCursor ? nextCursor : undefined };
}
