import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';
import { fetchFields, fetchRecord, fieldLabel } from '../shared/records';
import { recordUrl } from '../shared/transport';
import type { CorteksaField } from '../shared/types';
import { asObjects, namesOf, objectAt, slugsOf, textAt } from '../shared/values';
import { ASSIGNEES_KEY, TASK_OBJECT_SLUG } from './events';
import type { CorteksaEvent } from './types';

/** The record's own metadata; every other key of a record is a field value keyed by field slug. */
const RECORD_META_KEYS = new Set([
	'slug',
	'random_id',
	'name',
	'createdAt',
	'updatedAt',
	'position',
	'assignees',
	'capabilities',
	'creator',
	'updater',
	'relations',
	'linked_record',
	'session',
	'signals',
	'is_duplicate',
	'ai_written_fields',
]);

/** Fields every task carries under a fixed `name`, whatever their slug in this workspace. */
const TASK_ALIASES: ReadonlyArray<[fieldName: string, alias: string, labelled: boolean]> = [
	['name', 'task_title', false],
	['description', 'task_description', false],
	['status', 'task_status', true],
	['priority', 'task_priority', true],
	['task_type', 'task_type', true],
	['start_date', 'task_start_date', false],
	['due_date', 'task_due_date', false],
	['completed_at', 'task_completed_at', false],
];

export interface Delivery {
	event: CorteksaEvent;
	payload: IDataObject;
	/** `webhook-id`: record events carry no `event_id` of their own. */
	deliveryId: string | null;
	workspace: string;
	simplify: boolean;
}

interface RecordRef {
	objectSlug: string;
	recordSlug: string;
}

function recordRefOf(event: CorteksaEvent, payload: IDataObject): RecordRef | null {
	const isTask = event === 'task.created' || event === 'task.completed';
	const objectSlug = isTask ? TASK_OBJECT_SLUG : textAt(payload.object);
	const recordSlug = textAt(payload.record_slug);
	return objectSlug && recordSlug ? { objectSlug, recordSlug } : null;
}

function eventMeta(delivery: Delivery): IDataObject {
	return {
		event_id: textAt(delivery.payload.event_id) ?? delivery.deliveryId,
		event_time: textAt(delivery.payload.timestamp),
	};
}

function fieldValues(record: IDataObject): IDataObject {
	return Object.fromEntries(Object.entries(record).filter(([key]) => !RECORD_META_KEYS.has(key)));
}

function changedFieldLabel(fields: CorteksaField[], slug: string): string {
	if (slug === ASSIGNEES_KEY) {
		return 'Assignees';
	}
	const field = fields.find((candidate) => candidate.slug === slug);
	return field ? fieldLabel(field) : slug;
}

/** Falls back to the event's record slug: a record deleted since the event is read back empty. */
function recordSummary(record: IDataObject, ref: RecordRef, workspace: string | null): IDataObject {
	const assignees = asObjects(record.assignees);
	const owner = objectAt(assignees[0]);
	const linked = objectAt(record.linked_record);
	const slug = textAt(record.slug) ?? ref.recordSlug;
	return {
		id: slug,
		name: textAt(record.name),
		short_id: textAt(record.random_id),
		object_slug: ref.objectSlug,
		...(workspace ? { record_url: recordUrl(workspace, ref.objectSlug, slug) } : {}),
		created_at: textAt(record.createdAt),
		updated_at: textAt(record.updatedAt),
		owner_slug: textAt(owner.slug),
		owner_name: textAt(owner.name),
		assignee_slugs: slugsOf(assignees),
		assignee_names: namesOf(assignees, 'name'),
		creator_name: textAt(objectAt(record.creator).name),
		updater_name: textAt(objectAt(record.updater).name),
		linked_record_slug: textAt(linked.slug),
		linked_record_name: textAt(linked.name),
		linked_object_slug: textAt(linked.object_slug),
		linked_object_name: textAt(linked.object_name),
		fields: fieldValues(record),
		relations: objectAt(record.relations),
	};
}

function taskAliases(record: IDataObject, fields: CorteksaField[]): IDataObject {
	const aliases: IDataObject = {};
	for (const [fieldName, alias, labelled] of TASK_ALIASES) {
		const field = fields.find((candidate) => candidate.name === fieldName);
		const value = field ? record[field.slug] : undefined;
		aliases[alias] = labelled ? namesOf(asObjects(value), 'label') : (value ?? null);
	}
	return aliases;
}

function updateDetails(payload: IDataObject, fields: CorteksaField[]): IDataObject {
	const changes = objectAt(payload.changed_fields);
	const changedSlugs = Object.keys(changes);
	const previousAssignees = asObjects(payload.previous_assignees);
	return {
		changed_fields: changedSlugs.map((slug) => changedFieldLabel(fields, slug)).join(', ') || null,
		changed_field_ids: changedSlugs,
		changes,
		previous_assignee_slugs: slugsOf(previousAssignees),
		previous_assignee_names: namesOf(previousAssignees, 'name'),
	};
}

function stageDetails(payload: IDataObject, fields: CorteksaField[]): IDataObject {
	const to = objectAt(payload.to);
	const from = objectAt(payload.from);
	const fieldSlug = textAt(payload.field);
	return {
		stage: textAt(to.label),
		stage_id: textAt(to.id),
		previous_stage: textAt(from.label),
		previous_stage_id: textAt(from.id),
		stage_field_name: fieldSlug ? changedFieldLabel(fields, fieldSlug) : null,
		stage_field_id: fieldSlug,
	};
}

function commentItem(delivery: Delivery, ref: RecordRef, record: IDataObject | null): IDataObject {
	const comment = objectAt(delivery.payload.comment);
	const author = objectAt(comment.author);
	const parentSlug = textAt(comment.parent_slug);
	return {
		id: textAt(comment.slug),
		text: textAt(comment.text),
		is_reply: parentSlug !== null,
		parent_comment_id: parentSlug,
		author_slug: textAt(author.slug),
		author_name: textAt(author.name),
		created_at: textAt(comment.created_at),
		object_slug: ref.objectSlug,
		record_slug: ref.recordSlug,
		record_name: textAt(record?.name),
		record_url: recordUrl(delivery.workspace, ref.objectSlug, ref.recordSlug),
	};
}

/** The six events Make re-reads: the record as it is now, not as the event saw it. */
async function rereadItem(
	context: IWebhookFunctions,
	delivery: Delivery,
	ref: RecordRef,
): Promise<IDataObject> {
	const { data: record, fields } = await fetchRecord(context, ref.objectSlug, ref.recordSlug, {
		emptyIfMissing: true,
	});
	if (!delivery.simplify) {
		return { ...delivery.payload, record };
	}
	const { event, payload } = delivery;
	if (event === 'comment.created') {
		return { ...commentItem(delivery, ref, record), ...eventMeta(delivery) };
	}
	const current = record ?? {};
	return {
		...recordSummary(current, ref, delivery.workspace),
		...recordDetails(event, payload, current, fields),
		...eventMeta(delivery),
	};
}

function recordDetails(
	event: CorteksaEvent,
	payload: IDataObject,
	record: IDataObject,
	fields: CorteksaField[],
): IDataObject {
	switch (event) {
		case 'task.created':
		case 'task.completed':
			return taskAliases(record, fields);
		case 'record.updated':
			return updateDetails(payload, fields);
		case 'record.stage_changed':
			return stageDetails(payload, fields);
		default:
			return {};
	}
}

async function deletedItem(
	context: IWebhookFunctions,
	delivery: Delivery,
	ref: RecordRef,
): Promise<IDataObject> {
	const record = objectAt(delivery.payload.full_record);
	const summary = recordSummary(record, ref, null);
	if (summary.name === null) {
		const nameField = (await fetchFields(context, ref.objectSlug)).find(
			(field) => field.name === 'name',
		);
		summary.name = nameField ? textAt(record[nameField.slug]) : null;
	}
	return { ...summary, deleted_at: textAt(delivery.payload.timestamp), ...eventMeta(delivery) };
}

function workflowRunItem(payload: IDataObject): IDataObject {
	const workflow = objectAt(payload.workflow);
	const run = objectAt(payload.run);
	const trigger = objectAt(payload.trigger);
	const triggerRecord = objectAt(trigger.record);
	return {
		workflow_id: textAt(workflow.slug),
		workflow_name: textAt(workflow.name),
		run_id: textAt(run.slug),
		run_status: textAt(run.status),
		started_at: textAt(run.started_at),
		trigger_type: textAt(trigger.type),
		record_object_slug: textAt(triggerRecord.object_slug),
		record_slug: textAt(triggerRecord.record_slug),
	};
}

function finishedRunItem(payload: IDataObject): IDataObject {
	const run = objectAt(payload.run);
	const error = objectAt(run.error);
	return {
		...workflowRunItem(payload),
		finished_at: textAt(run.finished_at),
		error_code: textAt(error.code),
		error_message: textAt(error.message),
	};
}

function approvalItem(payload: IDataObject): IDataObject {
	const approval = objectAt(payload.approval);
	const approvers = asObjects(approval.approvers);
	return {
		id: textAt(approval.slug),
		approval_message: textAt(approval.message),
		approver_ids: slugsOf(approvers),
		approver_names: namesOf(approvers, 'name'),
		approval_expires_at: textAt(approval.expires_at),
		...workflowRunItem(payload),
	};
}

function chatSummary(chat: IDataObject): IDataObject {
	const contact = objectAt(chat.contact);
	const linked = objectAt(chat.linked_record);
	return {
		conversation_id: textAt(chat.slug),
		channel: textAt(chat.channel),
		provider: textAt(chat.provider),
		channel_id: textAt(chat.line_slug),
		contact_name: textAt(contact.name),
		contact_phone: textAt(contact.phone),
		contact_handle: textAt(contact.handle),
		linked_object_slug: textAt(linked.object_slug),
		linked_record_slug: textAt(linked.record_slug),
	};
}

function assignmentItem(payload: IDataObject): IDataObject {
	const assignee = objectAt(payload.assignee);
	const previous = objectAt(payload.previous_assignee);
	return {
		...chatSummary(objectAt(payload.chat)),
		assignee_slug: textAt(assignee.slug),
		assignee_name: textAt(assignee.name),
		previous_assignee_slug: textAt(previous.slug),
		previous_assignee_name: textAt(previous.name),
	};
}

function messageItem(payload: IDataObject): IDataObject {
	const message = objectAt(payload.message);
	return {
		id: textAt(message.slug),
		text: textAt(message.text),
		message_type: textAt(message.type),
		sent_by_name: textAt(objectAt(message.author).name),
		media_url: textAt(message.media_url),
		mime_type: textAt(message.mimetype),
		file_name: textAt(message.file_name),
		sent_at: textAt(message.sent_at),
		...chatSummary(objectAt(payload.chat)),
	};
}

function emailItem(payload: IDataObject): IDataObject {
	const message = objectAt(payload.message);
	const from = objectAt(message.from);
	const attachments = asObjects(message.attachments);
	const mailbox = objectAt(payload.mailbox);
	const record = objectAt(payload.record);
	return {
		id: textAt(message.slug),
		subject: textAt(message.subject),
		snippet: textAt(message.snippet),
		from_email: textAt(from.email),
		from_name: textAt(from.name),
		to_emails: namesOf(asObjects(message.to), 'email'),
		cc_emails: namesOf(asObjects(message.cc), 'email'),
		text: textAt(message.text),
		html: textAt(message.html),
		attachment_count: attachments.length,
		attachment_names: namesOf(attachments, 'file_name'),
		sent_at: textAt(message.sent_at),
		text_truncated: message.text_truncated === true,
		thread_id: textAt(payload.thread_slug),
		mailbox_id: textAt(mailbox.slug),
		mailbox_address: textAt(mailbox.address),
		linked_object_slug: textAt(record.object_slug),
		linked_record_slug: textAt(record.record_slug),
	};
}

function notificationItem(payload: IDataObject): IDataObject {
	const notification = objectAt(payload.notification);
	const data = objectAt(notification.data);
	return {
		id: textAt(notification.slug),
		title: textAt(notification.title),
		subtitle: textAt(notification.subtitle),
		body: textAt(notification.body),
		category: textAt(notification.category),
		kind: textAt(notification.event),
		performed_by_name: textAt(objectAt(notification.performed_by).name),
		object_slug: textAt(data.object_slug),
		record_slug: textAt(data.record_slug),
		created_at: textAt(notification.created_at),
	};
}

function payloadItem(event: CorteksaEvent, payload: IDataObject): IDataObject {
	switch (event) {
		case 'workflow.approval.created':
			return approvalItem(payload);
		case 'workflow.execution.completed':
		case 'workflow.execution.failed':
			return finishedRunItem(payload);
		case 'chat.assigned':
			return assignmentItem(payload);
		case 'message.received':
		case 'message.sent':
			return messageItem(payload);
		case 'email.received':
		case 'email.sent':
			return emailItem(payload);
		case 'notification.created':
			return notificationItem(payload);
		default:
			return {};
	}
}

const REREAD_EVENTS: ReadonlySet<CorteksaEvent> = new Set<CorteksaEvent>([
	'record.created',
	'record.updated',
	'record.stage_changed',
	'task.created',
	'task.completed',
	'comment.created',
]);

/** One output item for one delivery: Make's flat shape, or the raw body when not simplified. */
export async function buildItem(
	context: IWebhookFunctions,
	delivery: Delivery,
): Promise<IDataObject> {
	const { event, payload } = delivery;
	const ref = recordRefOf(event, payload);
	if (ref && REREAD_EVENTS.has(event)) {
		return await rereadItem(context, delivery, ref);
	}
	if (!delivery.simplify) {
		return payload;
	}
	if (ref && event === 'record.deleted') {
		return await deletedItem(context, delivery, ref);
	}
	return { ...payloadItem(event, payload), ...eventMeta(delivery) };
}
