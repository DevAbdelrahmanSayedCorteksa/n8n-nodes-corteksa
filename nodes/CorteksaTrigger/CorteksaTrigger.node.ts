import type {
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { triggerProperties } from './description';
import { TEST_EVENT, findEvent } from './events';
import { passesFilters } from './filters';
import { searchMembers, searchWorkflows } from '../shared/listSearch';
import { getUnits } from '../shared/loadOptions';
import { CREDENTIAL_NAME, workspaceOf } from '../shared/transport';
import { textAt } from '../shared/values';
import {
	getChannels,
	getMailboxFilter,
	getStageFields,
	getStages,
	getWatchableFields,
} from './loadOptions';
import { buildItem } from './output';
import { isAuthenticDelivery } from './signature';
import {
	SIGNING_SECRET_KEY,
	createSubscription,
	deleteSubscription,
	subscriptionExists,
} from './subscription';

const UNAUTHORIZED = 401;

export class CorteksaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Corteksa Trigger',
		name: 'corteksaTrigger',
		icon: { light: 'file:../../icons/corteksa.svg', dark: 'file:../../icons/corteksa.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description:
			'Starts the workflow when records, tasks, messages, emails or workflow runs change in Corteksa',
		defaults: {
			name: 'Corteksa Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: CREDENTIAL_NAME,
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: triggerProperties,
	};

	methods = {
		loadOptions: {
			getChannels,
			getMailboxes: getMailboxFilter,
			getObjects: getUnits,
			getStageFields,
			getStages,
			getWatchableFields,
		},
		listSearch: {
			searchMembers,
			searchWorkflows,
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return await subscriptionExists(this);
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return await createSubscription(this);
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return await deleteSubscription(this);
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		if (!request.rawBody) {
			await request.readRawBody();
		}
		const headers = this.getHeaderData();
		const secret = this.getWorkflowStaticData('node')[SIGNING_SECRET_KEY];
		const authentic =
			typeof secret === 'string' &&
			isAuthenticDelivery(secret, {
				headers,
				rawBody: request.rawBody,
				nowSeconds: Math.floor(Date.now() / 1000),
			});
		if (!authentic) {
			this.getResponseObject().status(UNAUTHORIZED).json({ message: 'Invalid signature' });
			return { noWebhookResponse: true };
		}

		const payload = this.getBodyData();
		const definition = findEvent(this.getNodeParameter('event'));
		if (!definition) {
			throw new NodeOperationError(this.getNode(), 'Choose an event to watch');
		}
		if (payload.event === TEST_EVENT || !passesFilters(this, definition.event, payload)) {
			return {};
		}

		const item = await buildItem(this, {
			event: definition.event,
			payload,
			deliveryId: textAt(headers['webhook-id']),
			workspace: await workspaceOf.call(this),
			simplify: this.getNodeParameter('simplify', true) === true,
		});
		return { workflowData: [this.helpers.returnJsonArray([item])] };
	}
}
