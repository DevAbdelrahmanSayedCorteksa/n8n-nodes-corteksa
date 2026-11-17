import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { recordUrl, workspaceOf } from '../../shared/transport';
import { asText } from '../../shared/values';
import { searchByPage, searchTerm, textParameter } from '../../shared/listSearch';

async function searchRecordsOf(
	context: ILoadOptionsFunctions,
	unitParameter: string,
	filter: string | undefined,
	paginationToken: string | undefined,
): Promise<INodeListSearchResult> {
	const unit = textParameter(context, unitParameter);
	if (!unit) {
		return { results: [] };
	}
	const workspace = await workspaceOf.call(context);
	return await searchByPage.call(
		context,
		requestPath`/v1/object/data/${unit}/lookup`,
		{ search: searchTerm(filter) },
		paginationToken,
		(row) => {
			const slug = asText(row.slug);
			return slug
				? { name: asText(row.name) || slug, value: slug, url: recordUrl(workspace, unit, slug) }
				: undefined;
		},
	);
}

export async function searchRecords(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchRecordsOf(this, 'unit', filter, paginationToken);
}

export async function searchLinkedRecords(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchRecordsOf(this, 'linkedUnit', filter, paginationToken);
}

export async function searchTasks(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const workspace = await workspaceOf.call(this);
	return await searchByPage.call(
		this,
		requestPath`/v1/object/data/task/lookup`,
		{ search: searchTerm(filter) },
		paginationToken,
		(row) => {
			const slug = asText(row.slug);
			return slug
				? { name: asText(row.name) || slug, value: slug, url: recordUrl(workspace, 'task', slug) }
				: undefined;
		},
	);
}
