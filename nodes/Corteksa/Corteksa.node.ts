import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { approvalDescription } from './resources/approval';
import { commentDescription } from './resources/comment';
import { conversationDescription } from './resources/conversation';
import { documentDescription } from './resources/document';
import { documentTemplateDescription } from './resources/documentTemplate';
import { emailDescription } from './resources/email';
import { memberDescription } from './resources/member';
import { recordDescription } from './resources/record';
import { taskDescription } from './resources/task';
import { teamDescription } from './resources/team';
import { workflowDescription } from './resources/workflow';
import { API_BASE_URL } from '../shared/transport';
import { searchUnits } from './listSearch/searchUnits';
import { searchLinkedRecords, searchRecords, searchTasks } from './listSearch/searchRecords';
import { searchMembers, searchWorkflows } from '../shared/listSearch';
import { getMailboxes, getUnits } from '../shared/loadOptions';
import { searchStartableWorkflows } from './listSearch/searchWorkflows';
import { searchConversations } from './listSearch/searchConversations';
import { searchMessageTemplates } from './listSearch/searchMessageTemplates';
import {
	getDocumentFileFields,
	getEmailFields,
	getFileFields,
	getPhoneFields,
	getRelatedRecords,
	getRelations,
	getRequiredTargetFields,
	getSearchFields,
	getTags,
} from './loadOptions/fields';
import {
	getApprovals,
	getChatTags,
	getComments,
	getDistributions,
	getDocumentTemplates,
	getDuplicates,
	getEmailTemplates,
	getEmailThreads,
	getMembers,
	getTemplateVariables,
	getWhatsAppChannels,
} from './loadOptions/lists';
import {
	getRecordCreateFields,
	getRecordUpdateFields,
	getTaskCreateFields,
	getTaskUpdateFields,
} from './resourceMapping/getFields';

export class Corteksa implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Corteksa',
		name: 'corteksa',
		icon: { light: 'file:../../icons/corteksa.svg', dark: 'file:../../icons/corteksa.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with records, tasks, WhatsApp, email and workflows in Corteksa CRM',
		defaults: {
			name: 'Corteksa',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'corteksaApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: API_BASE_URL,
			headers: {
				Accept: 'application/json',
				'Accept-Language': 'en',
				'Content-Type': 'application/json',
			},
			ignoreHttpStatusErrors: true,
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Approval', value: 'approval' },
					{ name: 'Comment', value: 'comment' },
					{ name: 'Conversation', value: 'conversation' },
					{ name: 'Document', value: 'document' },
					{ name: 'Document Template', value: 'documentTemplate' },
					{ name: 'Email', value: 'email' },
					{ name: 'Member', value: 'member' },
					{ name: 'Record', value: 'record' },
					{ name: 'Task', value: 'task' },
					{ name: 'Team', value: 'team' },
					{ name: 'Workflow', value: 'workflow' },
				],
				default: 'record',
			},
			...approvalDescription,
			...commentDescription,
			...conversationDescription,
			...documentDescription,
			...documentTemplateDescription,
			...emailDescription,
			...memberDescription,
			...recordDescription,
			...taskDescription,
			...teamDescription,
			...workflowDescription,
		],
	};

	methods = {
		listSearch: {
			searchConversations,
			searchLinkedRecords,
			searchMembers,
			searchMessageTemplates,
			searchRecords,
			searchStartableWorkflows,
			searchTasks,
			searchUnits,
			searchWorkflows,
		},
		loadOptions: {
			getApprovals,
			getChatTags,
			getComments,
			getDistributions,
			getDocumentFileFields,
			getDocumentTemplates,
			getDuplicates,
			getEmailFields,
			getEmailTemplates,
			getEmailThreads,
			getFileFields,
			getMailboxes,
			getMembers,
			getPhoneFields,
			getRelatedRecords,
			getRelations,
			getRequiredTargetFields,
			getSearchFields,
			getTags,
			getTemplateVariables,
			getUnits,
			getWhatsAppChannels,
		},
		resourceMapping: {
			getRecordCreateFields,
			getRecordUpdateFields,
			getTaskCreateFields,
			getTaskUpdateFields,
		},
	};
}
