import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { recordLocator, unitLocator } from '../../shared/descriptions';
import { collectionOf, textOf } from '../../shared/parameters';
import {
	assertSuccess,
	corteksaApiRequest,
	recordUrl,
	workspaceOf,
} from '../../../shared/transport';
import { asObject, asText } from '../../../shared/values';

const show = { resource: ['document'], operation: ['generate'] };

export const documentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['document'] } },
		options: [
			{
				name: 'Generate',
				value: 'generate',
				action: 'Generate document from template',
				description: "Fill a document template with a record's values and return the PDF",
				routing: {
					request: {
						method: 'POST',
						url: '=/v1/document-templates-v2/{{ toPathSegment($parameter.template) }}/pdf',
					},
					send: { preSend: [sendGenerateDocument] },
					output: { postReceive: [documentFile] },
				},
			},
		],
		default: 'generate',
	},
	unitLocator(show),
	{
		displayName: 'Document Template Name or ID',
		name: 'template',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getDocumentTemplates',
			loadOptionsDependsOn: ['unit.value'],
		},
		default: '',
		description:
			'A document template of the unit. Needs the API key to have document template access. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show },
	},
	recordLocator(show),
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the output binary field to put the PDF in',
		displayOptions: { show },
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
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				placeholder: 'e.g. quote.pdf',
				description: 'Leave empty for the name Corteksa gives the document',
			},
			{
				displayName: 'Save to File Field Name or ID',
				name: 'saveToField',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getDocumentFileFields',
					loadOptionsDependsOn: ['unit.value'],
				},
				default: '',
				description:
					'Also keep the PDF on the record in this file field. Needs write access to the unit. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	},
];

/** Saving to a field renders the PDF onto the record first; the file is then downloaded from there. */
export async function sendGenerateDocument(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const template = textOf(this, 'template');
	const record = textOf(this, 'record');
	const saveToField = asText(collectionOf(this, 'additionalFields').saveToField);

	requestOptions.headers = {
		...(requestOptions.headers ?? {}),
		Accept: 'application/pdf, application/json',
	};
	requestOptions.encoding = 'arraybuffer';
	requestOptions.json = false;

	if (!saveToField) {
		requestOptions.body = JSON.stringify({ dataSlug: record });
		return requestOptions;
	}
	const attached = await corteksaApiRequest.call(
		this,
		'POST',
		requestPath`/v1/document-templates-v2/${template}/attach-to-record`,
		{ body: { dataSlug: record, fieldSlug: saveToField } },
	);
	const filePath = asText(asObject(asObject(asObject(attached.data)?.file))?.filePath);
	requestOptions.method = 'GET';
	requestOptions.url = '/v1/files/download';
	requestOptions.qs = { ...(requestOptions.qs ?? {}), key: filePath };
	delete requestOptions.body;
	return requestOptions;
}

function fileNameFrom(disposition: unknown): string | undefined {
	const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(asText(disposition) ?? '');
	return match ? decodeURIComponent(match[1]) : undefined;
}

export async function documentFile(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	assertSuccess(this.getNode(), response);
	const raw = response.body;
	const buffer = Buffer.isBuffer(raw)
		? raw
		: raw instanceof ArrayBuffer
			? Buffer.from(raw)
			: Buffer.from(String(raw ?? ''), 'binary');
	const fileName =
		asText(collectionOf(this, 'additionalFields').fileName) ||
		fileNameFrom(response.headers?.['content-disposition']) ||
		'document.pdf';
	const unit = textOf(this, 'unit');
	const record = textOf(this, 'record');
	const binary = await this.helpers.prepareBinaryData(buffer, fileName, 'application/pdf');
	return [
		{
			json: {
				file_name: fileName,
				file_size: buffer.length,
				saved_to_record: !!asText(collectionOf(this, 'additionalFields').saveToField),
				unit_id: unit,
				record_id: record,
				record_url: recordUrl(await workspaceOf.call(this), unit, record),
			},
			binary: { [textOf(this, 'binaryPropertyName', 'data')]: binary },
		},
	];
}
