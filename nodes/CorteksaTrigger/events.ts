import type { CorteksaEvent, EventDefinition } from './types';

export const EVENTS: readonly EventDefinition[] = [
	{
		event: 'workflow.approval.created',
		name: 'Approval Requested',
		description: 'Triggers when a workflow run pauses for an approval',
		scope: 'none',
	},
	{
		event: 'comment.created',
		name: 'Comment Created',
		description: 'Triggers when someone comments on a record of the chosen object',
		scope: 'chosenObject',
	},
	{
		event: 'chat.assigned',
		name: 'Conversation Assigned',
		description: 'Triggers when a conversation is given to a member',
		scope: 'none',
	},
	{
		event: 'email.received',
		name: 'Email Received',
		description: 'Triggers when a connected mailbox receives an email',
		scope: 'none',
	},
	{
		event: 'email.sent',
		name: 'Email Sent',
		description: 'Triggers when an email is sent from a connected mailbox',
		scope: 'none',
	},
	{
		event: 'message.received',
		name: 'Message Received',
		description: 'Triggers when a WhatsApp, Instagram, Facebook or TikTok message arrives',
		scope: 'none',
	},
	{
		event: 'message.sent',
		name: 'Message Sent',
		description: 'Triggers when a WhatsApp, Instagram, Facebook or TikTok message is sent',
		scope: 'none',
	},
	{
		event: 'notification.created',
		name: 'Notification Created',
		description: 'Triggers when the member who created the API key gets a notification',
		scope: 'none',
	},
	{
		event: 'record.created',
		name: 'Record Created',
		description: 'Triggers when a record is created in the chosen object',
		scope: 'chosenObject',
	},
	{
		event: 'record.deleted',
		name: 'Record Deleted',
		description: 'Triggers when a record of the chosen object is deleted',
		scope: 'chosenObject',
	},
	{
		event: 'record.stage_changed',
		name: 'Record Stage Changed',
		description: 'Triggers when a record of the chosen object moves to another stage',
		scope: 'chosenObject',
	},
	{
		event: 'record.updated',
		name: 'Record Updated',
		description: 'Triggers when a record of the chosen object changes',
		scope: 'chosenObject',
	},
	{
		event: 'task.completed',
		name: 'Task Completed',
		description: 'Triggers when a task is marked as done',
		scope: 'task',
	},
	{
		event: 'task.created',
		name: 'Task Created',
		description: 'Triggers when a task is created',
		scope: 'task',
	},
	{
		event: 'workflow.execution.completed',
		name: 'Workflow Run Completed',
		description: 'Triggers when a workflow run finishes successfully',
		scope: 'none',
	},
	{
		event: 'workflow.execution.failed',
		name: 'Workflow Run Failed',
		description: 'Triggers when a workflow run fails',
		scope: 'none',
	},
];

export const TASK_OBJECT_SLUG = 'task';

/** How a record update names an assignee change in `changed_fields`. */
export const ASSIGNEES_KEY = 'assignees';

/** The body `event` of the delivery Corteksa sends from "Send test event"; it carries no data. */
export const TEST_EVENT = 'webhook.test';

export function findEvent(event: unknown): EventDefinition | undefined {
	return EVENTS.find((definition) => definition.event === event);
}

export function eventsWithScope(scope: EventDefinition['scope']): CorteksaEvent[] {
	return EVENTS.filter((definition) => definition.scope === scope).map(
		(definition) => definition.event,
	);
}
