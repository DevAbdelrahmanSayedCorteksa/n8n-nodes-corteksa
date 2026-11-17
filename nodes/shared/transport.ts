import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INode,
	JsonObject,
	IWebhookFunctions,
	RequestPath,
	WithRequestTarget,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import type { Pagination } from './types';
import { asObject } from './values';

export const CREDENTIAL_NAME = 'corteksaApi';

const SHARED_WORKSPACE = 'app';
const SUBDOMAIN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const DOCS_URL = 'https://docs.corteksa.com/api-reference/overview';

// Mirrors workspaceSubdomain() for requestDefaults, which only accepts an expression.
export const API_BASE_URL =
	'={{ "https://" + ((String($credentials.workspace || "app").trim().toLowerCase().replace(/^[a-z]+:\\/\\//, "").split(/[\\/?#:.]/)[0]) || "app") + ".corteksa.info/api" }}';

export type CorteksaContext =
	| IExecuteSingleFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IWebhookFunctions;

// How to fix the refusals whose API message alone does not say what to change in the node.
const CODE_HINTS: Record<string, string> = {
	DISTRIBUTION_RECORD_ALREADY_OWNED:
		"The record already has an owner. Turn on 'Replace Current Owner' to hand it on anyway",
};

export function workspaceSubdomain(node: INode, raw: unknown): string {
	const text = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
	const subdomain = text.replace(/^[a-z]+:\/\//, '').split(/[/?#:.]/)[0] || SHARED_WORKSPACE;
	if (!SUBDOMAIN.test(subdomain)) {
		throw new NodeOperationError(node, `"${text}" is not a Corteksa workspace`, {
			description:
				'In the Corteksa credential, enter only the first part of your Corteksa address, such as "acme" for acme.corteksa.com, or keep "app"',
		});
	}
	return subdomain;
}

export async function workspaceOf(this: CorteksaContext): Promise<string> {
	const credentials = await this.getCredentials(CREDENTIAL_NAME);
	return workspaceSubdomain(this.getNode(), credentials.workspace);
}

export function recordUrl(workspace: string, unit: string, record: string): string {
	return `https://${workspace}.corteksa.com/units/${encodeURIComponent(unit)}/list?drawerRecord=${encodeURIComponent(record)}`;
}

function decodeBody(body: unknown): unknown {
	const text = Buffer.isBuffer(body) ? body.toString('utf8') : body;
	if (typeof text !== 'string') {
		return text;
	}
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

function bodyObject(body: unknown): IDataObject {
	return asObject(decodeBody(body)) ?? {};
}

function withRequestId(text: string, body: IDataObject): string {
	return typeof body.request_id === 'string'
		? `${text} (Corteksa request ID: ${body.request_id})`
		: text;
}

/** Turns a non-2xx Corteksa answer into a NodeApiError that names the API code and says how to fix it. */
export function assertSuccess(node: INode, response: IN8nHttpFullResponse): void {
	const status = response.statusCode;
	if (status >= 200 && status < 300) {
		return;
	}
	const body = bodyObject(response.body);
	const apiMessage = typeof body.message === 'string' && body.message !== '' ? body.message : '';
	const code = typeof body.code === 'string' ? body.code : '';
	const codeSuffix = code ? ` [${code}]` : '';

	let message: string;
	let description: string;
	if (status === 401) {
		message = 'Corteksa did not accept the API key';
		description =
			"Check that the key is still active in Corteksa under Settings > Developers > API keys, and that 'Workspace' in the credential is the address the key belongs to";
	} else if (status === 403) {
		message = `${apiMessage || 'The API key is not allowed to do this'}${codeSuffix}`;
		description =
			'In Corteksa, go to Settings > Developers > API keys and give the key access to this unit or action, then try again';
	} else if (status === 404) {
		message = `${apiMessage || 'Corteksa could not find this item'}${codeSuffix}`;
		description =
			'Check the ID or pick the item from the list again: it may have been deleted, or the API key cannot see it';
	} else if (status === 429) {
		const retryAfter = response.headers?.['retry-after'];
		const wait = retryAfter ? ` Wait ${String(retryAfter)} seconds, then run again.` : '';
		message = 'Corteksa rate limit reached for this API key';
		description = `Each API key can make 120 requests a minute.${wait} To spread the calls, turn on 'Retry On Fail' in the node settings or add a Wait node between batches.`;
	} else if (status >= 500) {
		message = 'Corteksa could not complete the request';
		description = withRequestId(
			'Try again in a moment. If it keeps happening, contact Corteksa support',
			body,
		);
	} else {
		message = `${apiMessage || 'Corteksa refused the request'}${codeSuffix}`;
		description = withRequestId(
			CODE_HINTS[code] ??
				`Check the parameters of this node. The API reference explains each code: ${DOCS_URL}`,
			body,
		);
	}

	throw new NodeApiError(node, body as JsonObject, {
		message,
		description,
		httpCode: String(status),
	});
}

export interface RequestOptions {
	qs?: IDataObject;
	body?: IDataObject;
	headers?: IDataObject;
}

/** The full answer whatever its status, for callers that treat a refusal as success (a 404 on delete). */
export async function corteksaApiResponse(
	this: CorteksaContext,
	method: IHttpRequestMethods,
	path: RequestPath,
	options: RequestOptions = {},
): Promise<IN8nHttpFullResponse> {
	const workspace = await workspaceOf.call(this);
	const request: WithRequestTarget<IHttpRequestOptions> = {
		method,
		baseURL: `https://${workspace}.corteksa.info/api`,
		url: path,
		qs: options.qs,
		body: options.body,
		headers: { Accept: 'application/json', 'Accept-Language': 'en', ...options.headers },
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
	return (await this.helpers.httpRequestWithAuthentication.call(
		this,
		CREDENTIAL_NAME,
		request,
	)) as IN8nHttpFullResponse;
}

/** One authenticated call to the Corteksa API; a non-2xx answer throws the error assertSuccess builds. */
export async function corteksaApiRequest(
	this: CorteksaContext,
	method: IHttpRequestMethods,
	path: RequestPath,
	options: RequestOptions = {},
): Promise<IDataObject> {
	const response = await corteksaApiResponse.call(this, method, path, options);
	assertSuccess(this.getNode(), response);
	return bodyObject(response.body);
}

export function paginationOf(body: IDataObject): Pagination {
	const raw = asObject(body.pagination) ?? {};
	const numberOf = (value: unknown) => (typeof value === 'number' ? value : undefined);
	return {
		page: numberOf(raw.page),
		totalPages: numberOf(raw.totalPages),
		nextPage: numberOf(raw.nextPage) ?? null,
		hasMore: raw.hasMore === true,
		nextCursor: typeof raw.nextCursor === 'string' ? raw.nextCursor : null,
	};
}
