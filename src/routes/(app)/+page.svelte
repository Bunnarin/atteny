<script>
    import { goto } from '$app/navigation';
    export let data;

    let locationError = '';
    let successMessage = '';
    let copiedWorkplaceId = null; 

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Radius of the earth in m
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in m
        return d;
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    let clockingIn = false;

    function clockIn(workplace) {
        clockingIn = true;
        locationError = '';
        successMessage = '';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                const workLat = workplace.location.lat;
                const workLng = workplace.location.lon;
                const distance = calculateDistance(userLat, userLng, workLat, workLng);
                
                if (distance > workplace.proximity) {
                    locationError = `You are ${distance.toFixed(2)} m away from ${workplace.name}. You must be within ${workplace.proximity} m to clock in.`;
                } else {
                    fetch('/api/clock-in', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ file_id: workplace.file_id, name: workplace.name, employer: workplace.expand.employer }),
                    })
                    .then(response => response.json())
                    .then(data => successMessage = `Successfully clocked in to ${workplace.name}! Distance: ${distance.toFixed(2)} m`)
                    .catch(error => locationError = 'Failed to clock in.');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                locationError = 'Unable to retrieve your location.';
            }
        );
    }

    function copy_link(workplace) {
        navigator.clipboard.writeText(`${window.location.origin}/subscribe/${workplace.id}`);
        // change the button to copied
        copiedWorkplaceId = workplace.id;
    }
</script>

{#if data.user}
<div class="form-actions">
    <button class="btn-primary" on:click={() => goto('/workplace/new')}>Add Workplace</button>
</div>

<div>
    {#if data.workplaces_as_employer.length > 0}
    <h1 class="form-title">Workplaces (as employer)</h1>
    {#each data.workplaces_as_employer as workplace}
        <div class="form-section">
            <h2>{workplace.name}</h2>
            <button class="btn-primary" on:click={() => goto(`/workplace/${workplace.id}`)}>Edit</button>
            <button class="btn-primary" on:click={() => copy_link(workplace)}>
                {copiedWorkplaceId === workplace.id ? 'Copied!' : 'Invite Link'}
            </button>
        </div>
    {/each}
    {/if}
</div>

<div>
    {#if data.workplaces_as_employee.length > 0}
    <h1 class="form-title">Workplaces (as employee)</h1>
    {#if locationError}
        <div class="error">{locationError}</div>
    {/if}

    {#if successMessage}
        <script>
            clockingIn = false;
        </script>
        <div class="success">{successMessage}</div>
    {/if}

    {#each data.workplaces_as_employee as workplace}
        <div class="form-section">
            <h2>{workplace.name}</h2>
            <button class="btn-primary" on:click={() => clockIn(workplace)}>
                {#if !locationError && !successMessage && !clockingIn}
                    Clock In
                {:else if clockingIn}
                    Clocking In...
                {:else if locationError || successMessage}
                    Clock In
                {/if}
            </button>
        </div>
    {/each}
    {/if}
</div>
{/if}
