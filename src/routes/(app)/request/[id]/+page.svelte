<script>
    export let data;
    let handledRequests = [];

    function approve(id) {
        // confirm first
        if (!confirm('approve?')) return;
        handledRequests = [...handledRequests, id];
        fetch(`/api/approve/${id}`, { method: 'POST' })
    }
    function reject(id) {
        // confirm first
        if (!confirm('reject?')) return;
        handledRequests = [...handledRequests, id];
        fetch(`/api/reject/${id}`, { method: 'POST' })
    }
</script>

<h1>Pending Requests</h1>

<ul>
    {#each data.requests as request}
        {#if !handledRequests.includes(request.id)}
        <li>
            <strong>Date:</strong> {new Date(request.date).toLocaleDateString()}<br>
            <strong>Reason:</strong> {request.reason}<br>
            <strong>Created by:</strong> {request.expand?.createdBy?.full_name}<br>
            <button class="btn-primary" on:click={approve(request.id)}>Approve</button>
            <button class="btn-primary" on:click={reject(request.id)}>Reject</button>
        </li>
    {/if}
    {/each}
</ul>