import type { IDataObject, IHookFunctions } from 'n8n-workflow';
import { NodeOperationError, requestPath } from 'n8n-workflow';
import { assertSuccess, corteksaApiRequest, corteksaApiResponse } from '../shared/transport';
import { asObjects, objectAt, textAt } from '../shared/values';
import { TASK_OBJECT_SLUG, findEvent } from './events';
import type { EventDefinition } from './types';

const MAX_NAME_LENGTH = 120;
const NOT_FOUND = 404;

/** Static-data keys: Corteksa shows the signing secret only once, at subscribe time. */
export const SUBSCRIPTION_SLUG_KEY = 'subscriptionSlug';
export const SIGNING_SECRET_KEY = 'signingSecret';

type DesiredSubscription = {
	name: string;
	target_url: string;
	events: string[];
	object_slug?: string;
	include_own_changes: boolean;
};

function selectedEvent(context: IHookFunctions): EventDefinition {
	const definition = findEvent(context.getNodeParameter('event'));
	if (!definition) {
		throw new NodeOperationError(context.getNode(), 'Choose an event to watch');
	}
	return definition;
}

function objectSlugFor(context: IHookFunctions, definition: EventDefinition): string | undefined {
	if (definition.scope === 'task') {
		return TASK_OBJECT_SLUG;
	}
	if (definition.scope === 'none') {
		return undefined;
	}
	const objectSlug = context.getNodeParameter('objectSlug');
	if (typeof objectSlug !== 'string' || objectSlug === '') {
		throw new NodeOperationError(context.getNode(), 'Choose the object to watch');
	}
	return objectSlug;
}

/**
 * `include_own_changes`: every workflow on one credential shares its API key,
 * so without it a record one workflow writes would never start another.
 */
function desiredSubscription(context: IHookFunctions): DesiredSubscription {
	const definition = selectedEvent(context);
	const targetUrl = context.getNodeWebhookUrl('default');
	if (!targetUrl) {
		throw new NodeOperationError(
			context.getNode(),
			'n8n did not provide a webhook URL for this node',
		);
	}
	const objectSlug = objectSlugFor(context, definition);
	return {
		name: `n8n: ${definition.name}`.slice(0, MAX_NAME_LENGTH),
		target_url: targetUrl,
		events: [definition.event],
		...(objectSlug ? { object_slug: objectSlug } : {}),
		include_own_changes: true,
	};
}

function matches(subscription: IDataObject, desired: DesiredSubscription): boolean {
	const events = Array.isArray(subscription.events) ? subscription.events : [];
	return (
		subscription.is_active === true &&
		subscription.target_url === desired.target_url &&
		events.length === 1 &&
		events[0] === desired.events[0] &&
		(textAt(subscription.object_slug) ?? undefined) === desired.object_slug
	);
}

async function listSubscriptions(context: IHookFunctions): Promise<IDataObject[]> {
	const body = await corteksaApiRequest.call(
		context,
		'GET',
		requestPath`/v1/webhooks/subscriptions`,
	);
	return asObjects(body.data);
}

/** Already gone counts as removed: the user may have deleted it in Corteksa. */
async function removeSubscription(context: IHookFunctions, slug: string): Promise<void> {
	const response = await corteksaApiResponse.call(
		context,
		'DELETE',
		requestPath`/v1/webhooks/subscriptions/${slug}`,
	);
	if (response.statusCode !== NOT_FOUND) {
		assertSuccess(context.getNode(), response);
	}
}

/**
 * True only while Corteksa still has it switched on for this node's URL,
 * event and object, so a changed parameter or an auto-disabled subscription
 * makes n8n call `create` again.
 */
export async function subscriptionExists(context: IHookFunctions): Promise<boolean> {
	const staticData = context.getWorkflowStaticData('node');
	const slug = staticData[SUBSCRIPTION_SLUG_KEY];
	if (typeof slug !== 'string' || typeof staticData[SIGNING_SECRET_KEY] !== 'string') {
		return false;
	}
	const desired = desiredSubscription(context);
	const subscriptions = await listSubscriptions(context);
	return subscriptions.some(
		(subscription) => subscription.slug === slug && matches(subscription, desired),
	);
}

/**
 * Idempotent: a subscription already pointing at this node's URL is ours (the
 * URL is unique per node) and is replaced, so repeated calls leave exactly one.
 */
export async function createSubscription(context: IHookFunctions): Promise<boolean> {
	const desired = desiredSubscription(context);
	const subscriptions = await listSubscriptions(context);
	for (const stale of subscriptions.filter((s) => s.target_url === desired.target_url)) {
		const staleSlug = textAt(stale.slug);
		if (staleSlug) {
			await removeSubscription(context, staleSlug);
		}
	}
	const body = await corteksaApiRequest.call(
		context,
		'POST',
		requestPath`/v1/webhooks/subscriptions`,
		{ body: desired },
	);
	const created = objectAt(body.data);
	const slug = textAt(objectAt(created.subscription).slug);
	const secret = textAt(created.signing_secret);
	if (!slug || !secret) {
		throw new NodeOperationError(
			context.getNode(),
			'Corteksa did not return the new subscription and its signing secret',
		);
	}
	const staticData = context.getWorkflowStaticData('node');
	staticData[SUBSCRIPTION_SLUG_KEY] = slug;
	staticData[SIGNING_SECRET_KEY] = secret;
	return true;
}

export async function deleteSubscription(context: IHookFunctions): Promise<boolean> {
	const staticData = context.getWorkflowStaticData('node');
	const slug = staticData[SUBSCRIPTION_SLUG_KEY];
	if (typeof slug === 'string') {
		await removeSubscription(context, slug);
	}
	delete staticData[SUBSCRIPTION_SLUG_KEY];
	delete staticData[SIGNING_SECRET_KEY];
	return true;
}
