<script lang="ts">
	import '../../app.css';
	import type { LayoutServerData } from './$types';
	import { goto } from '$app/navigation';
	export let data: LayoutServerData;
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	$: error = $page.url.searchParams.get('error');
	$: message = $page.url.searchParams.get('message');

	onMount(() => {
		if (error && message) {
		// Show the error message to the user (using an alert for simplicity)
		alert(decodeURIComponent(message));
		// Optionally clear the URL after showing the message
		window.history.replaceState({}, '', '/');
		}
	});
</script>

<main class="form-container">
	<div class="header">
		<a href="/"><img class="logo" src="/favicon.png" alt="Logo"/></a>
		{#if data.user}
			<div class="user">
				<button class="btn-primary" on:click={() => goto('/payway')}>Buy</button>
				<button class="btn-secondary" on:click={() => goto('/logout')}>Logout</button>
			</div>
		{:else}
		<button class="btn-primary" on:click={() => goto('/login')}>Login</button>
		{/if}
	</div>
	<slot />
</main>
