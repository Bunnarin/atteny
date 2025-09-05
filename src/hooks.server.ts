import type { Handle } from '@sveltejs/kit';
import PocketBase from 'pocketbase';
import { dev } from '$app/environment';
import { PUBLIC_PB_URL } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/.well-known/')) {
		return new Response('Not found', { status: 404 });
	}
	
	const cookie = event.request.headers.get('cookie');

	event.locals.pb = new PocketBase(PUBLIC_PB_URL);

	// load the store data from the request cookie string
	event.locals.pb.authStore.loadFromCookie(cookie || '', 'pb_auth');

	if (event.locals.pb.authStore.isValid) {
		event.locals.user = structuredClone(event.locals.pb.authStore.record) ?? undefined;
	} else {
		event.locals.user = undefined;
	}

	const response = await resolve(event);

	// send back cookie to the client with the latest store state
	response.headers.append(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({ secure: !dev, sameSite: 'lax' }, 'pb_auth')
	);

	return response;
};
