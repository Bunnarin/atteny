<script>
    export let data;
</script>

<h1>Pending Requests</h1>

<ul>
    {#each data.requests as request}
        <li>
            <strong>Date:</strong> {new Date(request.date).toLocaleDateString()}<br>
            <strong>Reason:</strong> {request.reason}<br>
            <strong>Created by:</strong> {request.expand?.createdBy?.full_name}<br>
            <button class="btn-primary" on:click={fetch(`/api/approve/${request.id}`)}>Approve</button>
            <button class="btn-primary" on:click={fetch(`/api/reject/${request.id}`)}>Reject</button>
        </li>
    {/each}
</ul>