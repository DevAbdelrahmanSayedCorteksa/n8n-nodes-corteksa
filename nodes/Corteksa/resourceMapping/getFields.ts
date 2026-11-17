import type { ILoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';
import { activeFields } from '../../shared/records';
import { textParameter } from '../../shared/listSearch';
import { mapperFields } from '../shared/fields';

async function fieldsFor(
	context: ILoadOptionsFunctions,
	unit: string,
	forUpdate: boolean,
): Promise<ResourceMapperFields> {
	const fields = await activeFields(context, unit);
	return {
		fields: mapperFields(fields, forUpdate),
		emptyFieldsNotice: 'This unit has no fields the API can write',
	};
}

export async function getRecordCreateFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	return await fieldsFor(this, textParameter(this, 'unit'), false);
}

export async function getRecordUpdateFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	return await fieldsFor(this, textParameter(this, 'unit'), true);
}

export async function getTaskCreateFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	return await fieldsFor(this, 'task', false);
}

export async function getTaskUpdateFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	return await fieldsFor(this, 'task', true);
}
