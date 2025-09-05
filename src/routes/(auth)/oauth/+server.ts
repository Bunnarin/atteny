import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_REDIRECT_URI } from '$env/static/public';

export const GET: RequestHandler = async ({ cookies, locals, url }) => {
	if (url.searchParams.has('code')) {
		const code = url.searchParams.get('code')!;
		const state = url.searchParams.get('state')!;
		const providerCookie = cookies.get('provider');
		if (!providerCookie) {
			throw redirect(302, '/login?error=no_provider');
		}
		const provider = JSON.parse(providerCookie);
		
		// Extract the original state and redirect URL from the state parameter
		const [stateParam, encodedRedirect] = state.includes(':') 
			? state.split(':') 
			: [state, ''];

		if (stateParam !== provider.state) {
			throw redirect(302, '/login?error=invalid_state');
		}

		// Decode the redirect URL if it exists
		const redirectTo = encodedRedirect ? decodeURIComponent(encodedRedirect) : '';

		try {
			await locals.pb.collection('users').authWithOAuth2Code(
				provider.name, 
				code, 
				provider.codeVerifier, 
				PUBLIC_REDIRECT_URI
			);
			throw redirect(302, redirectTo || '/');
		} catch (error) {
			console.error('OAuth error:', error);
			throw redirect(302, '/login?error=oauth_failed');
		}
	} else if (url.searchParams.has('error')) {
		const error = url.searchParams.get('error') || 'unknown_error';
		throw redirect(302, '/login?error=' + error);
	} else {
		const redirectTo = url.searchParams.get('redirect');
		const authMethods = await locals.pb.collection('users').listAuthMethods();
		const [provider] = authMethods.oauth2.providers;
		let authUrl = provider.authURL;
		const urlObj = new URL(authUrl);
		
		// Set the base redirect_uri without any query parameters
		const baseRedirectUri = new URL(PUBLIC_REDIRECT_URI);
		
		// Add the redirect parameter to the state parameter instead of redirect_uri
		const state = redirectTo 
			? `${provider.state}:${encodeURIComponent(redirectTo)}`
			: provider.state;
		
		urlObj.searchParams.set('redirect_uri', baseRedirectUri.toString());
		urlObj.searchParams.set('state', state);
		urlObj.searchParams.set('access_type', 'offline');
		urlObj.searchParams.set('prompt', 'consent');
		
		const scope = urlObj.searchParams.get('scope');
		if (scope && !scope.includes('https://www.googleapis.com/auth/drive.file')) {
			const newScope = scope + ' https://www.googleapis.com/auth/drive.file';
			urlObj.searchParams.set('scope', newScope);
		}
		authUrl = urlObj.toString();

		cookies.set(
			'provider',
			JSON.stringify({
				state: provider.state,
				name: provider.name,
				codeVerifier: provider.codeVerifier,
				codeChallenge: provider.codeChallenge,
				codeChallengeMethod: provider.codeChallengeMethod,
			}),
			{ path: '/' }
		);

		return new Response(null, {
			status: 302,
			headers: {
				location: authUrl,
			},
		});
	}
};
