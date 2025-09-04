<script>
    import { page } from '$app/stores';
    $: form = $page.form;
</script>

<form method="POST">
    <input type="number" name="amount" required min="1"/>
    <button type="submit">Pay</button>
</form>

{#if form?.html}
    <iframe srcdoc={form.html} width="100%" height="600" title="PayWay Checkout"></iframe>
{:else if form?.error}
    <p>Error: {form.error}</p>
{/if}

