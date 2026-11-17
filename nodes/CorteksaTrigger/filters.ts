import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';
import { isObject, objectAt, textAt } from '../shared/values';
import type { CorteksaEvent } from './types';

function textParameter(context: IWebhookFunctions, name: string): string {
	const value = context.getNodeParameter(name, '', { extractValue: true });
	return typeof value === 'string' ? value : '';
}

function listParameter(context: IWebhookFunctions, name: string): string[] {
	const value = context.getNodeParameter(name, []);
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];
}

function optionalMatch(wanted: string, actual: unknown): boolean {
	return wanted === '' || textAt(actual) === wanted;
}

function stageMatches(context: IWebhookFunctions, payload: IDataObject): boolean {
	const toStages = listParameter(context, 'toStages');
	return (
		optionalMatch(textParameter(context, 'stageField'), payload.field) &&
		(toStages.length === 0 || toStages.includes(textAt(objectAt(payload.to).id) ?? ''))
	);
}

function changeMatches(context: IWebhookFunctions, payload: IDataObject): boolean {
	const watched = listParameter(context, 'watchFields');
	const changed = Object.keys(objectAt(payload.changed_fields));
	return watched.length === 0 || watched.some((slug) => changed.includes(slug));
}

/** Corteksa narrows a subscription by object only; every other filter is applied here, as Make does. */
export function passesFilters(
	context: IWebhookFunctions,
	event: CorteksaEvent,
	payload: IDataObject,
): boolean {
	switch (event) {
		case 'workflow.approval.created':
		case 'workflow.execution.completed':
		case 'workflow.execution.failed':
			return optionalMatch(textParameter(context, 'workflow'), objectAt(payload.workflow).slug);
		case 'chat.assigned':
			return optionalMatch(textParameter(context, 'assignee'), objectAt(payload.assignee).slug);
		case 'email.received':
		case 'email.sent':
			return optionalMatch(textParameter(context, 'mailbox'), objectAt(payload.mailbox).slug);
		case 'message.received':
		case 'message.sent': {
			const chat = objectAt(payload.chat);
			return (
				optionalMatch(textParameter(context, 'channelType'), chat.channel) &&
				optionalMatch(textParameter(context, 'channel'), chat.line_slug)
			);
		}
		case 'notification.created':
			return optionalMatch(
				textParameter(context, 'notificationCategory'),
				objectAt(payload.notification).category,
			);
		case 'record.deleted':
			// Make drops a delete whose stored record the key could no longer read.
			return isObject(payload.full_record);
		case 'record.stage_changed':
			return stageMatches(context, payload);
		case 'record.updated':
			return changeMatches(context, payload);
		default:
			return true;
	}
}
