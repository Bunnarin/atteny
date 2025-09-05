<script>
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    export let data;

    let locationError = '';
    let successMessage = '';
    let copiedWorkplaceId = null;

    // Clean up old localStorage entries (older than 30 days)
    function cleanupOldClockIns() {
        if (typeof window === 'undefined') return;
        const keys = Object.keys(localStorage);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        keys.forEach(key => {
            if (key.startsWith('clockin_')) {
                const parts = key.split('_');
                if (parts.length >= 3) {
                    const dateStr = parts[2];
                    const entryDate = new Date(dateStr);
                    if (entryDate < thirtyDaysAgo) {
                        localStorage.removeItem(key);
                    }
                }
            }
        });
    }

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

    function getClockInKey(workplaceId, date, windowIndex) {
        return `clockin_${workplaceId}_${date}_${windowIndex}`;
    }

    function hasClockedInToday(workplaceId, windowIndex) {
        if (typeof window === 'undefined') return false;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const key = getClockInKey(workplaceId, today, windowIndex);
        return localStorage.getItem(key) === 'true';
    }

    function recordClockIn(workplaceId, windowIndex) {
        if (typeof window === 'undefined') return;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const key = getClockInKey(workplaceId, today, windowIndex);
        localStorage.setItem(key, 'true');
    }

    function isWithinTimeWindow(workplaceId, rules) {
        if (!rules || rules.length === 0) {
            return { allowed: true, windowIndex: -1 }; // 24/7 access if no rules
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

        rules.forEach((rule, index) => {
            // get key val from rule
            const [[key, value]] = Object.entries(rule);
            const startTime = key.split(':').map(Number);
            const endTime = value.split(':').map(Number);
            const startMinutes = startTime[0] * 60 + startTime[1];
            const endMinutes = endTime[0] * 60 + endTime[1];

            let isInWindow = false;
            if (startMinutes <= endMinutes) {
                // Same day window
                isInWindow = currentTime >= startMinutes && currentTime <= endMinutes;
            } else {
                // Overnight window (e.g., 22:00 to 06:00)
                isInWindow = currentTime >= startMinutes || currentTime <= endMinutes;
            }

            if (isInWindow) {
                // Check if already clocked in for this window today
                if (hasClockedInToday(workplaceId, index))
                    return { allowed: false, windowIndex: index, reason: 'already_clocked_in' };
                return { allowed: true, windowIndex: index };
            }
        });

        return { allowed: false, windowIndex: -1, reason: 'outside_window' };
    }

    let clockingIn = false;

    function clockIn(workplace) {
        // Check time restrictions first
        const timeCheck = isWithinTimeWindow(workplace.id, workplace.rules);
        if (!timeCheck.allowed) {
            if (timeCheck.reason === 'already_clocked_in') {
                alert('You have already clocked in for this time window today.');
            } else {
                alert('Clock-in is not allowed at this time. Please check your workplace time rules.');
            }
            return;
        }

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
                        body: JSON.stringify({ file_id: workplace.file_id, name: workplace.name, employer: workplace.expand.employer, workplace_id: workplace.id }),
                    })
                    .then(response => response.json())
                    .then(data => {
                        successMessage = `Successfully clocked in to ${workplace.name}! Distance: ${distance.toFixed(2)} m`;
                        // Record the clock-in for this time window
                        if (timeCheck.windowIndex >= 0) {
                            recordClockIn(workplace.id, timeCheck.windowIndex);
                        }
                    })
                    .catch(error => locationError = 'Failed to clock in.');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                locationError = error.message;
            }
        );
    }

    function copy_link(workplace) {
        navigator.clipboard.writeText(`${window.location.origin}/subscribe/${workplace.id}`);
        // change the button to copied
        copiedWorkplaceId = workplace.id;
    }

    // Clean up old localStorage entries on component mount
    onMount(() => {
        cleanupOldClockIns();
    });
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
            <button
                class="btn-primary {!isWithinTimeWindow(workplace.id, workplace.rules).allowed ? 'btn-disabled' : ''}"
                on:click={() => clockIn(workplace)}
                disabled={!isWithinTimeWindow(workplace.id, workplace.rules).allowed}
            >
                {#if clockingIn && !locationError && !successMessage}
                    Clocking In...
                {:else}
                    Clock In
                {/if}
            </button>
        </div>
    {/each}
    {/if}
</div>
{/if}
