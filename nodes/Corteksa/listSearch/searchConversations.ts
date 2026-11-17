import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { asText } from '../../shared/values';
import { searchByPage, searchTerm } from '../../shared/listSearch';

export const CHATS_PAGE_SIZE = 50;

export async function searchConversations(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	return await searchByPage.call(
		this,
		requestPath`/v1/messaging/chats/all`,
		{ search: searchTerm(filter) },
		paginationToken,
		(chat) => {
			const slug = asText(chat.slug);
			if (!slug) {
				return undefined;
			}
			const contact = asText(chat.name) || asText(chat.phone) || slug;
			const channel = asText(chat.session_display_name);
			return { name: channel ? `${contact} · ${channel}` : contact, value: slug };
		},
		CHATS_PAGE_SIZE,
	);
}
