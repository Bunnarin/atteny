<script>
    import { page } from '$app/stores';
    import { PUBLIC_PAYWAY_ENDPOINT } from '$env/static/public';

    $: form = $page.form;
</script>

{#if !form}
    <form method="POST">
        <div class="form-question">
            <label class="question-title" for="amount">1$ per employee (pay once free forever):</label>
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

    <div class="container" style="margin-top: 75px;margin: 0 auto;">
        <div style="width: 200px;margin: 0 auto;">
            <h2>TOTAL: ${form.amount}</h2>
            <input type="button" id="checkout_button" value="Checkout Now">
        </div>
    </div>

    <script src="https://checkout.payway.com.kh/plugins/checkout2-0.js"></script>
    <link rel="stylesheet" href="https://payway.ababank.com/checkout-popup.html?file=css"/>
    <script>
        document.getElementById('checkout_button').addEventListener('click', function() {
            AbaPayway.checkout();
        });
    </script>
{/if}
