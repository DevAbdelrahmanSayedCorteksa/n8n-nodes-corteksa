import type { IDataObject, IExecuteSingleFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import type { Shaper } from '../../shared/output';
import { tasks } from '../../shared/output';
import { optionIds } from '../../../shared/records';
import { corteksaApiRequest } from '../../../shared/transport';
import type { CorteksaField } from '../../../shared/types';
import { asObject, asText } from '../../../shared/values';

const TASK_UNIT = 'task';

/** Whether the task's status option is one the task unit marks as closed. */
export function isDone(task: IDataObject, fields: CorteksaField[]): boolean {
	const status = fields.find((field) => field.name === 'status');
	if (!status) {
		return false;
	}
	const current = optionIds(task[status.slug])[0];
	return (status.options?.values ?? []).some(
		(option) => option.id === current && option.is_closed === true,
	);
}

export async function fetchTaskBody(
	context: IExecuteSingleFunctions,
	task: string,
): Promise<IDataObject> {
	return await corteksaApiRequest.call(
		context,
		'GET',
		requestPath`/v1/object/data/${TASK_UNIT}/${task}`,
	);
}

/** Writes answer the bare record; the task read adds the unit's fields, which name status and due date. */
export const taskAfterWrite: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const slug = asText(asObject(body.data)?.slug) ?? '';
	return await tasks.call(this, await fetchTaskBody(this, slug));
};
