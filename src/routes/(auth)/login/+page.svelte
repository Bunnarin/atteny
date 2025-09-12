<script>
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { user, loginWithGoogle } from '$lib/stores/auth';

    let loading = false;
    let error = '';

    onMount(() => {
        // Check if user is already logged in
        if ($user) {
            goto('/');
        }
    });

    async function handleLogin() {
        loading = true;
        error = '';

        try {
            await loginWithGoogle();
            // The auth store will handle the redirect
        } catch (err) {
            console.error('Login failed:', err);
            error = 'Login failed. Please try again.';
            loading = false;
        }
    }
</script>

<main class="form-container">
    <div class="form-section">
        <h1 class="form-title">Login</h1>

        {#if error}
            <div class="error-message">{error}</div>
        {/if}

        <button
            class="btn-primary"
            on:click={handleLogin}
            disabled={loading}
        >
            {#if loading}
                Logging in...
            {:else}
                Login with Google
            {/if}
        </button>
    </div>
</main>