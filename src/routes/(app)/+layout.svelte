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
		<button class="btn-primary" on:click={() => goto('/')}>Home</button>
		{#if data.user}
			<div class="user">
				<p>Employees: {data.user.current_employees}/{data.user.max_employees}</p>
				<button class="btn-primary" on:click={() => goto('/payway')}>Buy More</button>
				<h2>{data.user.full_name}</h2>
				<button class="btn-secondary" on:click={() => goto('/logout')}>Logout</button>
			</div>
		{:else}
			<a href="/login" class="btn-primary">Login</a>
		{/if}
	</div>
	<slot />
</main>
