import { createHash } from 'crypto';
import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import { workflowLocator } from '../../shared/descriptions';
import type { Shaper } from '../../shared/output';
import { collectionOf, textOf } from '../../shared/parameters';
import { asObject, asObjects, asText } from '../../../shared/values';

const show = { resource: ['workflow'], operation: ['run'] };

export const workflowRunDescription: INodeProperties[] = [
	workflowLocator(show, true),
	{
		displayName: 'Inputs',
		name: 'inputs',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add Input',
		description: "Values the workflow reads from its API or webhook trigger, such as 'order_total'",
		displayOptions: { show },
		options: [
			{
				displayName: 'Input',
				name: 'values',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
						placeholder: 'e.g. order_total',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						placeholder: 'e.g. 1250',
					},
				],
			},
		],
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Unique Key',
				name: 'uniqueKey',
				type: 'string',
				default: '',
				placeholder: 'e.g. order-1042',
				description:
					'Map an order or record ID here so a repeated run never starts the workflow twice for it. Leave empty to start a run on every call.',
			},
		],
	},
];

export async function sendWorkflowRun(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const inputs: IDataObject = {};
	for (const entry of asObjects(asObject(this.getNodeParameter('inputs', {}))?.values)) {
		const name = asText(entry.name)?.trim();
		if (name) {
			inputs[name] = entry.value ?? '';
		}
	}
	const uniqueKey = asText(collectionOf(this, 'additionalFields').uniqueKey)?.trim();
	if (uniqueKey) {
		// Hashed with the workflow so one key can be reused across workflows without colliding.
		const digest = createHash('sha256')
			.update(`${textOf(this, 'workflow')}|${uniqueKey}`)
			.digest('hex');
		requestOptions.headers = {
			...(requestOptions.headers ?? {}),
			'Idempotency-Key': `n8n-${digest}`,
		};
	}
	requestOptions.body = { inputs };
	return requestOptions;
}

export const startedRun: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const data = asObject(body.data) ?? {};
	return [
		{
			id: data.request_id ?? null,
			workflow_id: textOf(this, 'workflow'),
			already_started: data.duplicate === true,
		},
	];
};

export const retriedRun: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const data = asObject(body.data) ?? {};
	return [
		{
			id: textOf(this, 'runId'),
			workflow_id: textOf(this, 'workflow'),
			queued: data.queued === true,
		},
	];
};
