import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	ResourceMapperValue,
} from 'n8n-workflow';
import { asText } from '../../shared/values';

export function textOf(context: IExecuteSingleFunctions, name: string, fallback = ''): string {
	const value = context.getNodeParameter(name, fallback, { extractValue: true });
	return asText(value) ?? fallback;
}

export function booleanOf(
	context: IExecuteSingleFunctions,
	name: string,
	fallback = false,
): boolean {
	return context.getNodeParameter(name, fallback) === true;
}

export function listOf(context: IExecuteSingleFunctions, name: string): string[] {
	const value = context.getNodeParameter(name, []);
	return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function collectionOf(context: IExecuteSingleFunctions, name: string): IDataObject {
	const value = context.getNodeParameter(name, {});
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as IDataObject)
		: {};
}

export function mapperOf(
	context: IExecuteSingleFunctions,
	name = 'fields',
): ResourceMapperValue | undefined {
	const value = context.getNodeParameter(name, undefined);
	return typeof value === 'object' && value !== null && 'mappingMode' in value
		? (value as ResourceMapperValue)
		: undefined;
}

/** A JSON body without the keys whose value is undefined, empty text or an empty list. */
export function compactBody(body: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(body).filter(
			([, value]) =>
				value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0),
		),
	);
}

export function withJsonBody(
	requestOptions: IHttpRequestOptions,
	body: IDataObject,
): IHttpRequestOptions {
	requestOptions.body = compactBody(body);
	return requestOptions;
}
