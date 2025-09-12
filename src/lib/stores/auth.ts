import { writable } from 'svelte/store';
import PocketBase from 'pocketbase';

// Use env var if available, fallback to hardcoded URL
const pbUrl = import.meta.env?.PUBLIC_PB_URL || 'https://atteny-backend.popok.uk';

export const pb = new PocketBase(pbUrl);

// Load auth state from localStorage
if (typeof window !== 'undefined') {
	pb.authStore.loadFromCookie(document.cookie);
}

export const user = writable(pb.authStore.record);

// Update user store when auth state changes
pb.authStore.onChange((token, record) => {
	user.set(record);
	if (typeof window !== 'undefined') {
		document.cookie = pb.authStore.exportToCookie({ secure: false, sameSite: 'lax' }, 'pb_auth');
	}
});

export const loginWithGoogle = async (redirectTo?: string) => {
	try {
		const authData = await pb.collection('users').authWithOAuth2({
			provider: 'google',
			urlCallback: (url) => {
				window.location.href = url;
			}
		});
		return authData;
	} catch (error) {
		console.error('Login failed:', error);
		throw error;
	}
};

export const logout = async () => {
	pb.authStore.clear();
	user.set(null);
	if (typeof window !== 'undefined') {
		document.cookie = 'pb_auth=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
	}
};