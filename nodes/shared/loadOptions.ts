import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	RequestPath,
} from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { corteksaApiRequest, paginationOf } from './transport';
import { asObjects, asText } from './values';

const MAX_PAGES = 3;

export function option(name: string | undefined, value: unknown): INodePropertyOptions | undefined {
	const id = asText(value);
	return id ? { name: name || id, value: id } : undefined;
}

export function defined(items: Array<INodePropertyOptions | undefined>): INodePropertyOptions[] {
	return items.filter((item): item is INodePropertyOptions => item !== undefined);
}

/** Up to three pages of a page-numbered or cursor list, for dropdowns that cannot search. */
export async function collect(
	context: ILoadOptionsFunctions,
	path: RequestPath,
	qs: IDataObject,
	limit = 100,
): Promise<IDataObject[]> {
	const rows: IDataObject[] = [];
	let page = 1;
	let cursor: string | undefined;
	for (let fetched = 0; fetched < MAX_PAGES; fetched++) {
		const body = await corteksaApiRequest.call(context, 'GET', path, {
			qs: { ...qs, limit, ...(cursor ? { cursor } : page > 1 ? { page } : {}) },
		});
		rows.push(...asObjects(body.data));
		const pagination = paginationOf(body);
		if (pagination.hasMore && pagination.nextCursor) {
			cursor = pagination.nextCursor;
		} else if (pagination.nextPage || (pagination.page ?? 0) < (pagination.totalPages ?? 0)) {
			page += 1;
		} else {
			break;
		}
	}
	return rows;
}

export async function getUnits(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const body = await corteksaApiRequest.call(this, 'GET', requestPath`/v1/object/active`);
	return defined(asObjects(body.data).map((unit) => option(asText(unit.name), unit.slug)));
}

export async function getMailboxes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rows = await collect(this, requestPath`/v2/email/accounts`, {});
	return defined(
		rows.map((mailbox) => {
			const address = asText(mailbox.email_address) ?? asText(mailbox.slug);
			const name = asText(mailbox.name);
			return option(name ? `${name} <${address}>` : address, mailbox.slug);
		}),
	);
}

/** Connected messaging channels, optionally only those of some providers (`WAHA,WHATSAPP_CLOUD`). */
export async function channelOptions(
	context: ILoadOptionsFunctions,
	providerType?: string,
): Promise<INodePropertyOptions[]> {
	const body = await corteksaApiRequest.call(
		context,
		'GET',
		requestPath`/v2/messaging/sessions/lookup`,
		providerType ? { qs: { providerType } } : {},
	);
	return defined(
		asObjects(body.data).map((session) => {
			const name = asText(session.display_name) || asText(session.name) || asText(session.slug);
			const phone = asText(session.phone);
			return option(phone ? `${name} (+${phone})` : name, session.slug);
		}),
	);
}
