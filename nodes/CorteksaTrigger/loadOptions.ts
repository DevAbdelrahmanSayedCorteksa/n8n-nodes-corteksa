import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { textParameter } from '../shared/listSearch';
import { channelOptions, getMailboxes } from '../shared/loadOptions';
import { activeFields, fieldLabel, optionChoices } from '../shared/records';
import type { CorteksaField } from '../shared/types';
import { ASSIGNEES_KEY } from './events';

const STAGE_FIELD_TYPE = 'status';

async function objectFields(context: ILoadOptionsFunctions): Promise<CorteksaField[]> {
	return await activeFields(context, textParameter(context, 'objectSlug'));
}

function fieldOption(field: CorteksaField): INodePropertyOptions {
	return { name: fieldLabel(field), value: field.slug };
}

export async function getStageFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const fields = await objectFields(this);
	return [
		{ name: 'Any Stage Field', value: '' },
		...fields.filter((field) => field.type === STAGE_FIELD_TYPE).map(fieldOption),
	];
}

/** Stages are option ids, which survive a rename of the stage's label. */
export async function getStages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const stageField = textParameter(this, 'stageField');
	const fields = (await objectFields(this)).filter((field) =>
		stageField === '' ? field.type === STAGE_FIELD_TYPE : field.slug === stageField,
	);
	return fields.flatMap(optionChoices);
}

export async function getWatchableFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const fields = await objectFields(this);
	return [...fields.map(fieldOption), { name: 'Assignees', value: ASSIGNEES_KEY }];
}

export async function getMailboxFilter(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return [{ name: 'All Mailboxes', value: '' }, ...(await getMailboxes.call(this))];
}

export async function getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	return [{ name: 'All Channels', value: '' }, ...(await channelOptions(this))];
}
