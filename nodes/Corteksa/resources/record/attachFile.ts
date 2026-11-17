import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { recordLocator, simplifyParameter } from '../../shared/descriptions';
import { textOf } from '../../shared/parameters';

const show = { resource: ['record'], operation: ['attachFile'] };

export const recordAttachFileDescription: INodeProperties[] = [
	recordLocator(show),
	{
		displayName: 'File Field Name or ID',
		name: 'field',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getFileFields', loadOptionsDependsOn: ['unit.value'] },
		default: '',
		description:
			'A file or photo field of the unit. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show },
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		placeholder: 'e.g. data',
		hint: 'The name of the input binary field containing the file to attach',
		displayOptions: { show },
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		placeholder: 'e.g. contract.pdf',
		description: 'Leave empty to keep the name of the input file',
		displayOptions: { show },
	},
	simplifyParameter(show),
];

/** Corteksa takes files as multipart parts named after the field, next to an (empty) JSON `data` part. */
export async function sendAttachFile(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const property = textOf(this, 'binaryPropertyName', 'data');
	const binary = this.helpers.assertBinaryData(property);
	const buffer = await this.helpers.getBinaryDataBuffer(property);
	const fileName = textOf(this, 'fileName') || binary.fileName || 'file';

	const form = new FormData();
	form.append('data', '{}');
	form.append(
		textOf(this, 'field'),
		new Blob([new Uint8Array(buffer)], { type: binary.mimeType }),
		fileName,
	);

	const headers = { ...(requestOptions.headers ?? {}) };
	delete headers['Content-Type'];
	requestOptions.headers = headers;
	requestOptions.body = form;
	requestOptions.json = false;
	return requestOptions;
}
