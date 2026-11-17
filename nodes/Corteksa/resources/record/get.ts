import type { INodeProperties } from 'n8n-workflow';
import { recordLocator, simplifyParameter } from '../../shared/descriptions';

const show = { resource: ['record'], operation: ['get'] };

export const recordGetDescription: INodeProperties[] = [
	recordLocator(show),
	simplifyParameter(show),
];
