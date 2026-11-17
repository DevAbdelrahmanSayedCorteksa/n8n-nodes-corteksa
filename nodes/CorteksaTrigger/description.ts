import type { INodeProperties } from 'n8n-workflow';
import { EVENTS, eventsWithScope } from './events';
import type { CorteksaEvent } from './types';

const WORKFLOW_EVENTS: CorteksaEvent[] = [
	'workflow.approval.created',
	'workflow.execution.completed',
	'workflow.execution.failed',
];
const EMAIL_EVENTS: CorteksaEvent[] = ['email.received', 'email.sent'];
const MESSAGE_EVENTS: CorteksaEvent[] = ['message.received', 'message.sent'];

export const triggerProperties: INodeProperties[] = [
	{
		displayName: 'Event',
		name: 'event',
		type: 'options',
		noDataExpression: true,
		required: true,
		default: 'record.created',
		options: EVENTS.map(({ event, name, description }) => ({ name, value: event, description })),
	},
	{
		displayName: 'Object Name or ID',
		name: 'objectSlug',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getObjects' },
		required: true,
		default: '',
		displayOptions: { show: { event: eventsWithScope('chosenObject') } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Stage Field Name or ID',
		name: 'stageField',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getStageFields', loadOptionsDependsOn: ['objectSlug'] },
		default: '',
		displayOptions: { show: { event: ['record.stage_changed'] } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'New Stage Names or IDs',
		name: 'toStages',
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getStages',
			loadOptionsDependsOn: ['objectSlug', 'stageField'],
		},
		default: [],
		displayOptions: { show: { event: ['record.stage_changed'] } },
		description:
			'Only trigger when a record moves into one of these stages. Leave empty for any stage. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Watched Field Names or IDs',
		name: 'watchFields',
		type: 'multiOptions',
		typeOptions: { loadOptionsMethod: 'getWatchableFields', loadOptionsDependsOn: ['objectSlug'] },
		default: [],
		displayOptions: { show: { event: ['record.updated'] } },
		description:
			'Only trigger when one of these fields changes. Leave empty for every change. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Workflow',
		name: 'workflow',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		displayOptions: { show: { event: WORKFLOW_EVENTS } },
		description: 'Only this Corteksa workflow. Leave empty for every workflow the API key can see.',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchWorkflows', searchable: true },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. follow-up-3f9a2c1d7e60',
			},
		],
	},
	{
		displayName: 'Assigned To',
		name: 'assignee',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		displayOptions: { show: { event: ['chat.assigned'] } },
		description: 'Only conversations given to this member. Leave empty for every assignment.',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchMembers', searchable: true },
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. 7c2e9b41d0a5',
			},
		],
	},
	{
		displayName: 'Mailbox Name or ID',
		name: 'mailbox',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getMailboxes' },
		default: '',
		displayOptions: { show: { event: EMAIL_EVENTS } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Channel Type',
		name: 'channelType',
		type: 'options',
		default: '',
		displayOptions: { show: { event: MESSAGE_EVENTS } },
		options: [
			{ name: 'All Channel Types', value: '' },
			{ name: 'Facebook', value: 'facebook' },
			{ name: 'Instagram', value: 'instagram' },
			{ name: 'TikTok', value: 'tiktok' },
			{ name: 'WhatsApp', value: 'whatsapp' },
		],
		description: 'Only messages on this kind of channel',
	},
	{
		displayName: 'Channel Name or ID',
		name: 'channel',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		default: '',
		displayOptions: { show: { event: MESSAGE_EVENTS } },
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Notification Kind',
		name: 'notificationCategory',
		type: 'options',
		default: '',
		displayOptions: { show: { event: ['notification.created'] } },
		options: [
			{ name: 'Activity', value: 'activity' },
			{ name: 'All Kinds', value: '' },
			{ name: 'Mentions', value: 'mentions' },
			{ name: 'Messages', value: 'messages' },
			{ name: 'System', value: 'system' },
		],
		description: 'Only notifications of this kind',
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];
