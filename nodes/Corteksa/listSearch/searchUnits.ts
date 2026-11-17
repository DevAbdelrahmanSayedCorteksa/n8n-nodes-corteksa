import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { corteksaApiRequest } from '../../shared/transport';
import { asObjects, asText } from '../../shared/values';

export async function searchUnits(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const body = await corteksaApiRequest.call(this, 'GET', requestPath`/v1/object/active`);
	const term = filter?.trim().toLowerCase() ?? '';
	const results = asObjects(body.data)
		.map((unit) => ({ name: asText(unit.name) ?? '', value: asText(unit.slug) ?? '' }))
		.filter((unit) => unit.value !== '' && unit.name.toLowerCase().includes(term));
	return { results };
}
