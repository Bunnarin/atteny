<script lang="ts">
	import '../../app.css';
	import type { LayoutServerData } from './$types';

	export let data: LayoutServerData;
	
</script>

<main class="form-container">
	<div class="header">
		<a href="/">Home</a>
		{#if data.user}
			<div class="user">
				<p>Employees: {data.user.current_employees}/{data.user.max_employees}</p>
				<a href="/payway">Buy More</a>
				<h2>{data.user.full_name}</h2>
				<form action="/logout" method="POST">
					<button class="btn-secondary" type="submit">Logout</button>
				</form>
			</div>
		{:else}
			<a href="/oauth?provider=google" class="btn-primary">Login</a>
		{/if}
	</div>
	<slot />
</main>
