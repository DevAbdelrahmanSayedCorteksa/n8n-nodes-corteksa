import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { assignableMembersUnit, textParameter } from '../../shared/listSearch';
import { channelOptions, collect, defined, option } from '../../shared/loadOptions';
import { corteksaApiRequest } from '../../shared/transport';
import { asObject, asObjects, asText } from '../../shared/values';

export async function getMembers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const unit = await assignableMembersUnit.call(this);
	const rows = await collect(this, requestPath`/v2/admin/select-options/${unit}`, {}, 50);
	return defined(rows.map((member) => option(asText(member.name), member.slug)));
}

export async function getChatTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const body = await corteksaApiRequest.call(this, 'GET', requestPath`/v1/messaging/tags`);
	return defined(asObjects(body.data).map((tag) => option(asText(tag.label), tag.slug)));
}

export async function getWhatsAppChannels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return await channelOptions(this, 'WAHA,WHATSAPP_CLOUD');
}

export async function getEmailTemplates(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const rows = await collect(this, requestPath`/v1/email/templates`, {
		object_slug: textParameter(this, 'unit') || undefined,
	});
	return defined(rows.map((template) => option(asText(template.name), template.slug)));
}

export async function getEmailThreads(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const rows = await collect(this, requestPath`/v2/email/threads`, {});
	return defined(
		rows.map((thread) => option(asText(thread.subject) || '(no subject)', thread.slug)),
	);
}

export async function getDocumentTemplates(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const rows = await collect(this, requestPath`/v2/document-templates-v2`, {
		objectSlug: textParameter(this, 'unit') || undefined,
	});
	return defined(rows.map((template) => option(asText(template.name), template.slug)));
}

export async function getApprovals(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rows = await collect(this, requestPath`/v1/workflow/approvals`, { view: 'mine' });
	return defined(
		rows.map((approval) => {
			const workflow = asText(asObject(approval.workflow)?.name) ?? 'Approval';
			const message = asText(approval.message);
			return option(message ? `${workflow}: ${message}` : workflow, approval.slug);
		}),
	);
}

export async function getComments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const unit = textParameter(this, 'unit');
	const record = textParameter(this, 'record');
	if (!unit || !record) {
		return [];
	}
	const rows = await collect(this, requestPath`/v1/comments/${unit}/${record}`, {});
	return defined(
		rows.map((comment) => {
			const author = asText(asObject(comment.admin)?.name);
			const text = asText(comment.comment_description) ?? '';
			const preview = text.length > 60 ? `${text.slice(0, 60)}…` : text;
			return option(author ? `${author}: ${preview}` : preview, comment.comment_slug);
		}),
	);
}

export async function getDuplicates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const unit = textParameter(this, 'unit');
	const record = textParameter(this, 'record');
	if (!unit || !record) {
		return [];
	}
	const body = await corteksaApiRequest.call(
		this,
		'GET',
		requestPath`/v2/object/data/${unit}/${record}/duplicates`,
		{ qs: { limit: 100 } },
	);
	return defined(
		asObjects(asObject(body.data)?.data).map((row) => option(asText(row.name), row.slug)),
	);
}

/** Scenarios and rules of the unit, as `scenario:<id>` and `rule:<id>` so the override knows which it got. */
export async function getDistributions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const unit = textParameter(this, 'unit');
	const scenarios = await corteksaApiRequest.call(
		this,
		'GET',
		requestPath`/v2/lead-distribution/scenarios`,
		{
			qs: { object_slug: unit },
		},
	);
	const rules = await corteksaApiRequest.call(
		this,
		'GET',
		requestPath`/v2/lead-distribution/rules`,
		{
			qs: { object_slug: unit },
		},
	);
	const active = (row: IDataObject) => row.is_active !== false;
	return defined([
		...asObjects(scenarios.data)
			.filter(active)
			.map((row) => option(`${asText(row.name)} (scenario)`, `scenario:${asText(row.slug)}`)),
		...asObjects(rules.data)
			.filter(active)
			.map((row) => option(`${asText(row.name)} (rule)`, `rule:${asText(row.slug)}`)),
	]);
}

export async function getTemplateVariables(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const template = textParameter(this, 'template');
	if (!template) {
		return [];
	}
	const body = await corteksaApiRequest.call(this, 'GET', requestPath`/v2/templates/${template}`);
	return defined(
		asObjects(asObject(body.data)?.variables).map((variable) =>
			option(asText(variable.label) || asText(variable.name), variable.name),
		),
	);
}
