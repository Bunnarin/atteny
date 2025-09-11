import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_FREE_TIER } from '$env/static/public';

export const GET: RequestHandler = async ({ cookies, locals, url, getClientAddress }) => {
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

		if (stateParam !== provider.state) 
			throw redirect(302, '/login?error=invalid_state');

		// init the ip to put into create_record
		const ip = getClientAddress();
		// Decode the redirect URL if it exists
		const redirectTo = encodedRedirect ? decodeURIComponent(encodedRedirect) : '';

		// Update user record with Google tokens and ip address if they exist
		try {
			const { record, meta } = await locals.pb.collection('users').authWithOAuth2Code(
				provider.name, 
				code, 
				provider.codeVerifier, 
				url.origin + "/login",
				{ 
					free_spots: PUBLIC_FREE_TIER, 
					emailVisibility: true,
					ip_address: ip
				}
			);
			// if signing in from pre-auth (created by employer), update the name and refresh_token
			if (!record.google_refresh_token)
				await locals.pb.collection('users').update(record.id, {
					ip_address: ip,
					google_refresh_token: meta.refreshToken,
					full_name: meta.name,
				});
			else
				await locals.pb.collection('users').update(record.id, {
					ip_address: ip,
				});
		} catch (error) {
			// log the user out
			await locals.pb.authStore.clear();
			const msg = "another account detected on this device. You cannot sign in. If you wish to use this device, you must sign the other account on another device. this is to prevent cheating";
			throw redirect(302, '/?error=auth_failed&message=' + encodeURIComponent(msg));
		}
		throw redirect(302, redirectTo || '/');
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
		const baseRedirectUri = new URL(url.origin + "/login");
		
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
