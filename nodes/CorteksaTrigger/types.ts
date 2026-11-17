export type CorteksaEvent =
	| 'chat.assigned'
	| 'comment.created'
	| 'email.received'
	| 'email.sent'
	| 'message.received'
	| 'message.sent'
	| 'notification.created'
	| 'record.created'
	| 'record.deleted'
	| 'record.stage_changed'
	| 'record.updated'
	| 'task.completed'
	| 'task.created'
	| 'workflow.approval.created'
	| 'workflow.execution.completed'
	| 'workflow.execution.failed';

/** Which object a subscription is scoped to: the one the user picks, the Tasks object, or none. */
export type SubscriptionScope = 'chosenObject' | 'task' | 'none';

export interface EventDefinition {
	event: CorteksaEvent;
	name: string;
	description: string;
	scope: SubscriptionScope;
}
