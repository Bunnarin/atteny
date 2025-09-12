<script lang="ts">
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { logout } from '$lib/stores/auth';

    onMount(async () => {
        await logout();
        goto('/');
    });
</script>

<main class="form-container">
    <div class="form-section">
        <h1 class="form-title">Logging out...</h1>
        <p>Please wait while we log you out.</p>
    </div>
</main>

<style>
    .form-container {
        max-width: 400px;
        margin: 2rem auto;
        padding: 2rem;
    }

    .form-section {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        text-align: center;
    }

    .form-title {
        color: #333;
        margin-bottom: 1rem;
    }
</style>