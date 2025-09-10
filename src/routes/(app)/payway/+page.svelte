<script>
    import { page } from '$app/stores';
    import { PUBLIC_PAYWAY_ENDPOINT, PUBLIC_UNIT_PRICE } from '$env/static/public';

    $: form = $page.form;
</script>

{#if !form}
    <form method="POST">
        <div class="form-question">
            <label class="question-title" for="amount">{PUBLIC_UNIT_PRICE}$ per employee (pay once free forever):</label>
            <input class="question-input" type="number" name="amount" min="1" required />
        </div>
        <button class="btn-primary" type="submit">Pay</button>
    </form>
{:else}
    <form method="POST" target="aba_webservice" action={PUBLIC_PAYWAY_ENDPOINT} id="aba_merchant_request">
        {#each Object.entries(form) as [key, value]}
            <input type="hidden" name={key} value={value} />
        {/each}
    </form>
    <!-- submit this form on load -->
    <script>
        document.getElementById('aba_merchant_request').submit();
    </script>
{/if}
