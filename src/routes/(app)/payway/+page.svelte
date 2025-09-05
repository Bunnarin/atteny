<script>
    import { page } from '$app/stores';
    $: form = $page.form;
</script>

<form method="POST">
    <div class="form-question">
        <label class="question-title" for="amount">Amount:</label>
        <input class="question-input" type="number" min="1" required />
    </div>
    <button class="btn-primary" type="submit">Pay</button>
</form>



