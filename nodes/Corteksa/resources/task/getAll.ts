import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';
import {
	linkedRecordLocator,
	returnAllAndLimit,
	simplifyParameter,
	unitLocator,
} from '../../shared/descriptions';
import { fieldsOf } from '../../../shared/records';
import { pagePagination, tasks, type Shaper } from '../../shared/output';
import { booleanOf, collectionOf, textOf } from '../../shared/parameters';
import { asObject, asObjects, asText } from '../../../shared/values';
import { isDone } from './shared';

const show = { resource: ['task'], operation: ['getAll'] };
const linkedShow = { ...show, filterByRecord: [true] };

export const taskGetManyDescription: INodeProperties[] = [
	{
		displayName: 'Filter by Related Record',
		name: 'filterByRecord',
		type: 'boolean',
		default: false,
		description: 'Whether to return only the tasks of one record',
		displayOptions: { show },
	},
	unitLocator(linkedShow, 'linkedUnit', 'Related Unit'),
	linkedRecordLocator(linkedShow),
	...returnAllAndLimit(show, pagePagination),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Include Finished Tasks',
				name: 'includeDone',
				type: 'boolean',
				default: false,
				description: 'Whether to also return tasks whose status is a closed one',
			},
			{
				displayName: 'Title Contains',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'e.g. Call Sara',
				description: 'Only tasks whose title contains this text',
			},
		],
	},
	simplifyParameter(show),
];

/** A record's tasks come from their own endpoint; every other listing is a task search. */
export async function sendTaskGetMany(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const filters = collectionOf(this, 'filters');
	if (booleanOf(this, 'filterByRecord')) {
		requestOptions.method = 'GET';
		requestOptions.url = `/v1/object/task/for/${encodeURIComponent(textOf(this, 'linkedRecord'))}`;
		requestOptions.qs = {
			...(requestOptions.qs ?? {}),
			object_slug: textOf(this, 'linkedUnit'),
			show_completed: filters.includeDone === true,
		};
		return requestOptions;
	}
	requestOptions.method = 'POST';
	requestOptions.url = '/v1/object/data/task/search';
	requestOptions.body = { searchTerm: (asText(filters.title) ?? '').trim() };
	return requestOptions;
}

export const filteredTasks: Shaper = async function (
	this: IExecuteSingleFunctions,
	body: IDataObject,
) {
	const filters = collectionOf(this, 'filters');
	const title = (asText(filters.title) ?? '').trim().toLowerCase();
	const keepDone = filters.includeDone === true || booleanOf(this, 'filterByRecord');
	const page = asObject(body.data) ?? {};
	const fields = fieldsOf(page.fields);
	const rows = asObjects(page.data).filter(
		(task) =>
			(!title || (asText(task.name) ?? '').toLowerCase().includes(title)) &&
			(keepDone || !isDone(task, fields)),
	);
	return await tasks.call(this, { data: { fields: page.fields ?? [], data: rows } });
};
