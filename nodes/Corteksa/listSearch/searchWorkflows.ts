import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { searchByPage, searchTerm, slugItem } from '../../shared/listSearch';

export async function searchStartableWorkflows(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByPage.call(
		this,
		requestPath`/v1/workflow`,
		{ search: searchTerm(filter), is_active: true, trigger_type: 'incoming_webhook' },
		paginationToken,
		slugItem,
	);
}
