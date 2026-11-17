import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CorteksaApi implements ICredentialType {
	name = 'corteksaApi';

	displayName = 'Corteksa API';

	icon: Icon = { light: 'file:../icons/corteksa.svg', dark: 'file:../icons/corteksa.dark.svg' };

	documentationUrl = 'https://docs.corteksa.com/api-reference/overview';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'In Corteksa, go to Settings > Developers > API keys, click New key, give it access to the units your workflows use, and paste the key here. It starts with crtk_live_.',
		},
		{
			displayName: 'Workspace',
			name: 'workspace',
			type: 'string',
			required: true,
			default: 'app',
			placeholder: 'e.g. acme',
			description:
				'Keep "app" if you sign in at app.corteksa.com. If you sign in at your own address, such as acme.corteksa.com, enter only its first part: acme.',
		},
	];

	// Generic header auth, so the HTTP Request node can use this credential as a predefined type.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey.trim()}}',
			},
		},
	};

	// Same workspace normalization as the node: a pasted address such as https://acme.corteksa.com/units still resolves to "acme".
	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{ "https://" + ((String($credentials.workspace || "app").trim().toLowerCase().replace(/^[a-z]+:\\/\\//, "").split(/[\\/?#:.]/)[0]) || "app") + ".corteksa.info/api" }}',
			url: '/v1/me',
			method: 'GET',
		},
	};
}
