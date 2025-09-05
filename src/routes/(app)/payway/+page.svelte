<script>
    import { page } from '$app/stores';
    $: form = $page.form;
</script>

<form method="POST">
    <div class="form-question">
        <label class="question-title" for="amount">1$ per employee (pay once free forever):</label>
        <input class="question-input" type="number" min="1" required />
    </div>
    <button class="btn-primary" type="submit">Pay</button>
</form>



