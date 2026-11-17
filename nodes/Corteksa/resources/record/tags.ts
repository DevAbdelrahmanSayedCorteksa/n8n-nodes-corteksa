import type { IExecuteSingleFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { recordLocator, simplifyParameter } from '../../shared/descriptions';
import { listOf, textOf } from '../../shared/parameters';
import { fetchRecord, optionIds } from '../../../shared/records';

const addShow = { resource: ['record'], operation: ['addTags'] };
const removeShow = { resource: ['record'], operation: ['removeTags'] };

const tagsParameter = (show: { resource: string[]; operation: string[] }): INodeProperties => ({
	displayName: 'Tag Names or IDs',
	name: 'tags',
	type: 'multiOptions',
	required: true,
	typeOptions: { loadOptionsMethod: 'getTags', loadOptionsDependsOn: ['unit.value'] },
	default: [],
	description:
		'Tags of the unit\'s Tag field. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	displayOptions: { show },
});

export const recordAddTagsDescription: INodeProperties[] = [
	recordLocator(addShow),
	tagsParameter(addShow),
	simplifyParameter(addShow),
];

export const recordRemoveTagsDescription: INodeProperties[] = [
	recordLocator(removeShow),
	tagsParameter(removeShow),
	simplifyParameter(removeShow),
];

async function sendTags(
	context: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
	change: (current: string[], chosen: string[]) => string[],
): Promise<IHttpRequestOptions> {
	const { fields, data } = await fetchRecord(
		context,
		textOf(context, 'unit'),
		textOf(context, 'record'),
	);
	const tagField = fields.find((field) => field.type === 'tag');
	if (!tagField) {
		throw new NodeOperationError(context.getNode(), 'This unit has no Tag field', {
			description: 'Add a Tag field to the unit in Corteksa, or pick another unit',
		});
	}
	requestOptions.body = {
		data: { [tagField.slug]: change(optionIds(data?.[tagField.slug]), listOf(context, 'tags')) },
	};
	return requestOptions;
}

export async function sendAddTags(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	return await sendTags(this, requestOptions, (current, chosen) => [
		...new Set([...current, ...chosen]),
	]);
}

export async function sendRemoveTags(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	return await sendTags(this, requestOptions, (current, chosen) =>
		current.filter((tag) => !chosen.includes(tag)),
	);
}
