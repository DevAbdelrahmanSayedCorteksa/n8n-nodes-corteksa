import type { INodeProperties } from 'n8n-workflow';

type Show = Record<string, string[]>;

export const mailboxParameter = (show: Show): INodeProperties => ({
	displayName: 'Mailbox Name or ID',
	name: 'mailbox',
	type: 'options',
	required: true,
	typeOptions: { loadOptionsMethod: 'getMailboxes' },
	default: '',
	description:
		'The connected mailbox to send from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	displayOptions: { show },
});

export const threadParameter = (show: Show, description: string): INodeProperties => ({
	displayName: 'Email Thread Name or ID',
	name: 'thread',
	type: 'options',
	required: true,
	typeOptions: { loadOptionsMethod: 'getEmailThreads' },
	default: '',
	description: `${description} The list shows the 300 most recent threads. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.`,
	displayOptions: { show },
});

export const bodyFormatOption: INodeProperties = {
	displayName: 'Body Format',
	name: 'bodyFormat',
	type: 'options',
	options: [
		{ name: 'HTML', value: 'html' },
		{ name: 'Plain Text', value: 'text' },
	],
	default: 'text',
	description: "Whether 'Body' is plain text or HTML",
};

export function bodyKey(format: unknown): 'body_html' | 'body_text' {
	return format === 'html' ? 'body_html' : 'body_text';
}

export function recipients(value: unknown): Array<{ email: string }> | undefined {
	const emails = String(value ?? '')
		.split(',')
		.map((email) => email.trim())
		.filter((email) => email !== '');
	return emails.length ? emails.map((email) => ({ email })) : undefined;
}
