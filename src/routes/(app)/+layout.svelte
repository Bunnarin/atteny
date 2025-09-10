<script lang="ts">
	import '../../app.css';
	import type { LayoutServerData } from './$types';
	import { goto } from '$app/navigation';
	export let data: LayoutServerData;
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	$: error = $page.url.searchParams.get('error');
	$: message = $page.url.searchParams.get('message');

	let deferredPrompt: any;
	let showInstallButton = false;

	onMount(() => {
		if (error && message) {
		// Show the error message to the user (using an alert for simplicity)
		alert(decodeURIComponent(message));
		// Optionally clear the URL after showing the message
		window.history.replaceState({}, '', '/');
		}

		// Check if app is already installed
		if (window.matchMedia('(display-mode: standalone)').matches) {
			showInstallButton = false;
		} else {
			// Listen for beforeinstallprompt event
			window.addEventListener('beforeinstallprompt', (e) => {
				e.preventDefault();
				deferredPrompt = e;
				showInstallButton = true;
			});
		}
	});

	function installPWA() {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			deferredPrompt.userChoice.then((choiceResult: any) => {
				if (choiceResult.outcome === 'accepted') {
					console.log('User accepted the install prompt');
				} else {
					console.log('User dismissed the install prompt');
				}
				deferredPrompt = null;
				showInstallButton = false;
			});
		}
	}
</script>

<main class="form-container">
	<div class="header">
		<a href="/"><img class="logo" src="/favicon.png" alt="Logo"/></a>
		{#if data.user}
			<div class="user">
				{#if showInstallButton}
				<button class="btn-secondary" on:click={installPWA}>Install App</button>
				{/if}
				<button class="btn-primary" on:click={() => goto('/payway')}>Buy</button>
				<button class="btn-secondary" on:click={() => goto('/logout')}>Logout</button>
			</div>
		{:else}
		<button class="btn-primary" on:click={() => goto('/login')}>Login</button>
		{/if}
	</div>
	<slot />
</main>
