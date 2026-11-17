import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { SEARCHABLE_TYPES } from '../shared/fields';
import { activeFields, fieldLabel, optionChoices } from '../../shared/records';
import { corteksaApiRequest } from '../../shared/transport';
import type { CorteksaField } from '../../shared/types';
import { asObjects, asText } from '../../shared/values';
import { textParameter } from '../../shared/listSearch';

async function fieldsOfType(
	context: ILoadOptionsFunctions,
	unitParameter: string,
	keep: (field: CorteksaField) => boolean,
): Promise<INodePropertyOptions[]> {
	const fields = await activeFields(context, textParameter(context, unitParameter));
	return fields.filter(keep).map((field) => ({ name: fieldLabel(field), value: field.slug }));
}

export async function getSearchFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await fieldsOfType(this, 'unit', (field) => SEARCHABLE_TYPES.has(field.type));
}

export async function getFileFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return await fieldsOfType(
		this,
		'unit',
		(field) => field.type === 'file' || field.type === 'photo',
	);
}

export async function getDocumentFileFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await fieldsOfType(this, 'unit', (field) => field.type === 'file');
}

export async function getPhoneFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return await fieldsOfType(
		this,
		'unit',
		(field) => field.type === 'phone' || field.type === 'whatsapp_number',
	);
}

export async function getEmailFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return await fieldsOfType(this, 'unit', (field) => field.type === 'email');
}

export async function getRelations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const fields = await activeFields(this, textParameter(this, 'unit'));
	return fields
		.filter((field) => field.type === 'relation')
		.map((field) => {
			const label = fieldLabel(field);
			const target = field.target_object_name;
			return {
				name: target && target !== label ? `${label} (${target})` : label,
				value: field.slug,
			};
		});
}

export async function getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const fields = await activeFields(this, textParameter(this, 'unit'));
	return fields.filter((field) => field.type === 'tag').flatMap(optionChoices);
}

/** Records the chosen relation can link to: the first 100 matches of its target unit. */
export async function getRelatedRecords(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const relation = textParameter(this, 'relation');
	const fields = await activeFields(this, textParameter(this, 'unit'));
	const target = fields.find((field) => field.slug === relation)?.target_object_slug;
	if (!target) {
		return [];
	}
	const body = await corteksaApiRequest.call(
		this,
		'GET',
		requestPath`/v1/object/data/${target}/lookup`,
		{
			qs: { page: 1, limit: 100 },
		},
	);
	return asObjects(body.data).map((row) => ({
		name: asText(row.name) || asText(row.slug) || '',
		value: asText(row.slug) ?? '',
	}));
}

const MOVE_VALUE_TYPES = new Set([
	'text',
	'long_text',
	'email',
	'link',
	'phone',
	'whatsapp_number',
	'number',
	'currency',
	'boolean',
	'rating',
	'date',
	'start_date',
	'due_date',
	'datetime',
	'select',
	'status',
	'priority',
	'multi_select',
	'tag',
	'source_name',
]);

export async function getRequiredTargetFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await fieldsOfType(
		this,
		'targetUnit',
		(field) => Boolean(field.required) && MOVE_VALUE_TYPES.has(field.type),
	);
}
