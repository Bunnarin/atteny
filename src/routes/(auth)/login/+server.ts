import { PUBLIC_REDIRECT_URI } from '$env/static/public';
import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AuthProviderInfo } from 'pocketbase';

export const GET: RequestHandler = async ({ locals, url, cookies }) => {
	const provider: AuthProviderInfo | undefined = JSON.parse(cookies.get('provider') || 'null');
	if (!provider) throw error(400, 'Missing provider');

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');

	if (!code || !state) {
		throw error(400, 'Missing code or state');
	}

	// Extract the original state and redirect URL from the state parameter
	const [stateParam, encodedRedirect] = state.includes(':') 
		? state.split(':')
		: [state, ''];

	if (stateParam !== provider.state) {
		throw error(400, 'Invalid state');
	}

	// Decode the redirect URL if it exists
	const redirectTo = encodedRedirect ? decodeURIComponent(encodedRedirect) : '';

	// clear the cookie after use
	cookies.delete('provider', { path: '/' });

	const { meta, record } = await locals.pb.collection('users')
		.authWithOAuth2Code(provider.name, code, provider.codeVerifier, PUBLIC_REDIRECT_URI, { 
			max_employees: 10, 
			emailVisibility: true 
		});
	// if new user
	if (!record.refresh_token) {
		await locals.pb.collection('workplace_invite').getFullList({
			filter: `email = "${record.email}"`,
			expand: 'workplace'  // Make sure to expand the workplace relation
		})
		.then(async (invites) => {
			for (const invite of invites) {
				await locals.pb.collection('workplace').update(invite.workplace, {
					'employees+': record.id
				});
				await locals.pb.collection('workplace_invite').delete(invite.id);
			}
		});
	}

	// Update user record with Google tokens if they exist
	if (meta?.accessToken && meta?.refreshToken) {
		await locals.pb.collection('users').update(record.id, {
			google_access_token: meta.accessToken,
			google_refresh_token: meta.refreshToken,
		});
	}

	// Use the decoded redirect URL or fall back to the query parameter or root
	const redirectUrl = redirectTo || url.searchParams.get('redirect') || '/';
	throw redirect(302, redirectUrl);
};
