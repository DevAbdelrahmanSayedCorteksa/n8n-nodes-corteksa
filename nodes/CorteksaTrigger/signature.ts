import { createHmac, timingSafeEqual } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

type Headers = ReturnType<IWebhookFunctions['getHeaderData']>;

const SECRET_PREFIX = 'whsec_';

/** Standard Webhooks' default: Corteksa signs each attempt, retries included, when it sends it. */
export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export interface SignedRequest {
	headers: Headers;
	rawBody: Buffer;
	nowSeconds: number;
}

function header(headers: Headers, name: string): string | undefined {
	const value = headers[name];
	return Array.isArray(value) ? value[0] : value;
}

function sameText(left: string, right: string): boolean {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Verifies the Standard Webhooks `webhook-signature` Corteksa sends:
 * base64 HMAC-SHA256, keyed by the base64 part of `whsec_…`, over
 * `<webhook-id>.<webhook-timestamp>.<raw body>`.
 */
export function isAuthenticDelivery(secret: string, request: SignedRequest): boolean {
	const id = header(request.headers, 'webhook-id');
	const timestamp = header(request.headers, 'webhook-timestamp');
	const signatures = header(request.headers, 'webhook-signature');
	if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp)) {
		return false;
	}
	if (Math.abs(request.nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) {
		return false;
	}
	const key = Buffer.from(
		secret.startsWith(SECRET_PREFIX) ? secret.slice(SECRET_PREFIX.length) : secret,
		'base64',
	);
	const expected = createHmac('sha256', key)
		.update(`${id}.${timestamp}.`)
		.update(request.rawBody)
		.digest('base64');
	return signatures.split(' ').some((entry) => {
		const [version, signature] = entry.split(',');
		return version === 'v1' && signature !== undefined && sameText(signature, expected);
	});
}
