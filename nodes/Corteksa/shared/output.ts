import type {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	IN8nRequestOperations,
	INodeExecutionData,
	PostReceiveAction,
} from 'n8n-workflow';
import { assertSuccess, recordUrl, workspaceOf } from '../../shared/transport';
import { fieldsOf } from '../../shared/records';
import type { CorteksaField } from '../../shared/types';
import { asObject, asObjects, asText, epochToIso, joinNames } from '../../shared/values';

export type Shaper = (this: IExecuteSingleFunctions, body: IDataObject) => Promise<IDataObject[]>;

/**
 * Every operation's postReceive starts here: requests run with ignoreHttpStatusErrors, so this
 * is the one place a non-2xx answer becomes a NodeApiError before the body is shaped.
 */
export function respond(shape: Shaper): PostReceiveAction {
	return async function (
		this: IExecuteSingleFunctions,
		_items: INodeExecutionData[],
		response: IN8nHttpFullResponse,
	): Promise<INodeExecutionData[]> {
		assertSuccess(this.getNode(), response);
		const rows = await shape.call(this, asObject(response.body) ?? {});
		return rows.map((json) => ({ json }));
	};
}

export const deletedResult: Shaper = async () => [{ deleted: true }];

export const dataList: Shaper = async (body) => asObjects(body.data);

export function wantsSimple(context: IExecuteSingleFunctions): boolean {
	return context.getNodeParameter('simplify', true) as boolean;
}

export function unitParameter(context: IExecuteSingleFunctions, name = 'unit'): string {
	return String(context.getNodeParameter(name, '', { extractValue: true }));
}

export function simplifyRecord(record: IDataObject, unit: string, workspace: string): IDataObject {
	const assignees = asObjects(record.assignees);
	const id = asText(record.slug) ?? '';
	return {
		id,
		name: record.name,
		short_id: record.random_id,
		unit_id: unit,
		owner_id: assignees[0]?.slug,
		owner_name: assignees[0]?.name,
		assignee_names: joinNames(assignees),
		created_at: record.createdAt,
		updated_at: record.updatedAt,
		record_url: recordUrl(workspace, unit, id),
	};
}

/** Records under `path` of the body, simplified on request; `unit` names the unit for the record link. */
export function records(path: 'data' | 'data.data', unitName = 'unit'): Shaper {
	return async function (this: IExecuteSingleFunctions, body: IDataObject) {
		const container = path === 'data' ? body.data : asObject(body.data)?.data;
		const rows = Array.isArray(container) ? asObjects(container) : [asObject(container) ?? {}];
		if (!wantsSimple(this)) {
			return rows;
		}
		const unit = unitParameter(this, unitName);
		const workspace = await workspaceOf.call(this);
		return rows.map((row) => simplifyRecord(row, unit, workspace));
	};
}

function valueByName(task: IDataObject, fields: CorteksaField[], name: string): unknown {
	const field = fields.find((candidate) => candidate.name === name);
	return field ? task[field.slug] : undefined;
}

function optionLabels(value: unknown): string {
	return Array.isArray(value) ? joinNames(asObjects(value), 'label') : (asText(value) ?? '');
}

export function simplifyTask(
	task: IDataObject,
	fields: CorteksaField[],
	workspace: string,
): IDataObject {
	const assignees = asObjects(task.assignees);
	const linked = asObject(task.linked_record);
	const id = asText(task.slug) ?? '';
	return {
		id,
		title: task.name,
		status: optionLabels(valueByName(task, fields, 'status')),
		priority: optionLabels(valueByName(task, fields, 'priority')),
		due_date: valueByName(task, fields, 'due_date') ?? null,
		owner_name: assignees[0]?.name,
		linked_record_id: linked?.slug ?? null,
		linked_record_name: linked?.name ?? null,
		created_at: task.createdAt,
		record_url: recordUrl(workspace, 'task', id),
	};
}

/** Tasks come with the task unit's fields, which name the status, priority and due date columns. */
export const tasks: Shaper = async function (this: IExecuteSingleFunctions, body: IDataObject) {
	const page = asObject(body.data) ?? {};
	const fields = fieldsOf(page.fields);
	const rows = Array.isArray(page.data) ? asObjects(page.data) : [asObject(page.data) ?? {}];
	if (!wantsSimple(this)) {
		return rows;
	}
	const workspace = await workspaceOf.call(this);
	return rows.map((row) => simplifyTask(row, fields, workspace));
};

const CHANNEL_NAMES: Record<string, string> = { WAHA: 'whatsapp', WHATSAPP_CLOUD: 'whatsapp' };

export function simplifyConversation(chat: IDataObject): IDataObject {
	const provider = asText(chat.provider_type) ?? '';
	return {
		id: chat.slug,
		contact_name: chat.name,
		contact_phone: chat.phone,
		channel: CHANNEL_NAMES[provider] ?? provider.toLowerCase(),
		channel_name: chat.session_display_name,
		owner_name: asObject(chat.assigned_admin)?.name ?? null,
		unread_count: chat.unread_count ?? 0,
		answered: chat.is_answered === true,
		last_message: chat.last_message_body,
		last_message_at: epochToIso(chat.last_message) ?? null,
	};
}

export function conversations(
	rows: IDataObject[],
	context: IExecuteSingleFunctions,
): IDataObject[] {
	return wantsSimple(context) ? rows.map(simplifyConversation) : rows;
}

// n8n evaluates `request` before the first call too (with an empty $response) and replaces whole
// keys of the request with it, so the next page goes in the URL and the query string stays intact.
export const pagePagination: IN8nRequestOperations['pagination'] = {
	type: 'generic',
	properties: {
		continue:
			'={{ !!$response.body?.pagination?.nextPage || (($response.body?.pagination?.page ?? 0) < ($response.body?.pagination?.totalPages ?? 0)) }}',
		request: {
			url: '={{ $response.body ? $request.url.split("?")[0] + "?page=" + (($response.body.pagination?.page ?? 1) + 1) : $request.url }}',
		},
	},
};

export const cursorPagination: IN8nRequestOperations['pagination'] = {
	type: 'generic',
	properties: {
		continue:
			'={{ $response.body?.pagination?.hasMore === true && !!$response.body?.pagination?.nextCursor }}',
		request: {
			url: '={{ $response.body?.pagination?.nextCursor ? $request.url.split("?")[0] + "?cursor=" + encodeURIComponent($response.body.pagination.nextCursor) : $request.url }}',
		},
	},
};
