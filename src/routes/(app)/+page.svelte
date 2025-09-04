<script>
    import { goto } from '$app/navigation';
    export let data;

    let locationError = '';
    let successMessage = '';

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

    function clockIn(workplace) {
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
                        body: JSON.stringify({ file_id: workplace.file_id }),
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
</script>

{#if data.user}
<div class="form-actions">
    <button class="btn-primary" on:click={() => goto('/workplace/new')}>Add Workplace</button>
</div>

<div>
    <h1 class="form-title">Workplaces (as employer)</h1>
    <ul>
        {#each data.workplaces_as_employer as workplace}
            <li><a href={`/workplace/${workplace.id}`}>{workplace.name}</a></li>
        {/each}
    </ul>
</div>

<div>
    <h1 class="form-title">Workplaces (as employee)</h1>
    {#if locationError}
        <div class="error">{locationError}</div>
    {/if}

    {#if successMessage}
        <div class="success">{successMessage}</div>
    {/if}

    {#each data.workplaces_as_employee as workplace}
        <div class="form-section">
            <h2>{workplace.name}</h2>
            <p>Proximity: {workplace.proximity} m</p>
            <button class="btn-primary" on:click={() => clockIn(workplace)}>Clock In</button>
        </div>
    {/each}
</div>
{/if}
