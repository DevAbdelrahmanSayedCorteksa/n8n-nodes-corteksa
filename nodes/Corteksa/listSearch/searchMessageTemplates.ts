import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { asObject, asText } from '../../shared/values';
import { searchByPage, textParameter } from '../../shared/listSearch';

/** Active templates the chosen WhatsApp number can send: general ones and its own WhatsApp Business ones. */
export async function searchMessageTemplates(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const channel = textParameter(this, 'channel');
	const term = filter?.trim().toLowerCase() ?? '';
	return await searchByPage.call(
		this,
		requestPath`/v2/templates`,
		{ status: 'ACTIVE', is_active: true },
		paginationToken,
		(template) => {
			const slug = asText(template.slug);
			const name = asText(template.name) ?? slug ?? '';
			const sendable =
				!channel || template.type === 'GENERAL' || asObject(template.session)?.slug === channel;
			if (!slug || !sendable || !name.toLowerCase().includes(term)) {
				return undefined;
			}
			const language = asText(template.language);
			return { name: language ? `${name} (${language})` : name, value: slug };
		},
	);
}
