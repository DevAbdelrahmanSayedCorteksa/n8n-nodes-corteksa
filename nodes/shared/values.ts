import type { IDataObject } from 'n8n-workflow';

/** Readers that narrow the API's untyped JSON once, where it is read. */
export function isObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asObject(value: unknown): IDataObject | undefined {
	return isObject(value) ? value : undefined;
}

export function objectAt(value: unknown): IDataObject {
	return asObject(value) ?? {};
}

export function asObjects(value: unknown): IDataObject[] {
	return Array.isArray(value) ? value.filter(isObject) : [];
}

export function asText(value: unknown): string | undefined {
	if (typeof value === 'string') {
		return value;
	}
	return typeof value === 'number' ? String(value) : undefined;
}

/** For trigger output, which keeps every key: a missing or blank text is null, not dropped. */
export function textAt(value: unknown): string | null {
	return typeof value === 'string' && value !== '' ? value : null;
}

/** The non-empty `key` of each item, such as the slugs of a list of members. */
export function textsOf(items: IDataObject[], key: string): string[] {
	return items.map((item) => asText(item[key])).filter((text): text is string => !!text);
}

export function slugsOf(items: IDataObject[]): string[] {
	return textsOf(items, 'slug');
}

export function joinNames(items: IDataObject[], key = 'name'): string {
	return textsOf(items, key).join(', ');
}

export function namesOf(items: IDataObject[], key: string): string | null {
	return joinNames(items, key) || null;
}

/** Splits a comma-separated string or an array into trimmed, non-empty strings. */
export function asList(value: unknown): string[] {
	const items: unknown[] = Array.isArray(value) ? value : String(value ?? '').split(',');
	return items.map((item) => String(item).trim()).filter((item) => item !== '');
}

export function isBlank(value: unknown): boolean {
	return (
		value === undefined ||
		value === null ||
		(typeof value === 'string' && value.trim() === '') ||
		(Array.isArray(value) && value.length === 0)
	);
}

export function epochToIso(value: unknown): string | undefined {
	return typeof value === 'number' ? new Date(value * 1000).toISOString() : undefined;
}
