<script lang="ts">
	import '../../app.css';
	import type { LayoutServerData } from './$types';
	import { goto } from '$app/navigation';
	export let data: LayoutServerData;
	
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
			<a href="/oauth" class="btn-primary">Login</a>
		{/if}
	</div>
	<slot />
</main>
