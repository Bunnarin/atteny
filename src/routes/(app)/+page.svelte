<script>
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { writable, get } from 'svelte/store';

    // Store for clock-in statuses
    const clockInStatuses = writable({});


    export let data;

    let locationError = '';
    let successMessage = '';
    let selectedWorkplaceId = null;
    let clockingIn = false;

    let showLeaveModal = false;
    let date = '';
    let reason = '';
    let formError = '';
    let formSuccess = '';

    // Add error message state
    $: errorMessage = $page.url.searchParams.get('message');

    // Load clock-in statuses from localStorage
    function loadClockInStatuses() {
        if (typeof window === 'undefined') return;
        const statuses = {};
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('clockin_')) {
                statuses[key] = localStorage.getItem(key) === 'true';
            }
        });
        clockInStatuses.set(statuses);
    }

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
        // Reload statuses after cleanup
        loadClockInStatuses();
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

    function hasClockedInToday(workplaceId, windowIndex, statuses) {
        if (typeof window === 'undefined') return false;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const key = `clockin_${workplaceId}_${today}_${windowIndex}`;
        return statuses[key] === true;
    }

    function recordClockIn(workplaceId, windowIndex) {
        if (typeof window === 'undefined') return;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const key = `clockin_${workplaceId}_${today}_${windowIndex}`;
        localStorage.setItem(key, 'true');
        clockInStatuses.update(statuses => {
            statuses[key] = true;
            return statuses;
        });
    }

    function isWithinTimeWindow(workplaceId, rules, statuses) {
        if (!rules || rules.length === 0) {
            return { allowed: true, windowIndex: -1 }; // 24/7 access if no rules
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            // get key val from rule
            const startTime = rule.s.split(':').map(Number);
            const endTime = rule.e.split(':').map(Number);
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
                if (hasClockedInToday(workplaceId, i, statuses))
                    return { allowed: false, windowIndex: i, reason: 'already_clocked_in' };
                return { allowed: true, windowIndex: i };
            }
        }

        return { allowed: false, windowIndex: -1, reason: 'outside_window' };
    }

    function clockIn(workplace) {
        // Check time restrictions first
        const timeCheck = isWithinTimeWindow(workplace.id, workplace.rules, get(clockInStatuses));
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
                        body: JSON.stringify({ workplace }),
                    })
                    .then(response => response.json())
                    .then(data => {
                        successMessage = `Successfully clocked in to ${workplace.name}! Distance: ${distance.toFixed(2)} m`;
                        // Record the clock-in for this time window
                        if (timeCheck.windowIndex >= 0) {
                            recordClockIn(workplace.id, timeCheck.windowIndex);
                        }
                    })
                    .catch(error => locationError = error);
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
        selectedWorkplaceId = workplace.id;
    }

    // Clean up old localStorage entries on component mount
    onMount(() => {
        cleanupOldClockIns();
        loadClockInStatuses();
    });
</script>

{#if errorMessage}
    <div class="error-message">
        {decodeURIComponent(errorMessage)}
    </div>
{/if}

{#if data.user}
<div class="form-actions">
    <button class="btn-primary" on:click={() => goto('/workplace/new')}>Add Workplace</button>
</div>
{/if}

{#if data.workplaces_as_employer.length > 0}
<h1 class="form-title">Workplaces (as employer)</h1>
{#each data.workplaces_as_employer as workplace}
    <div class="form-section">
        <h2>{workplace.name}</h2>
        <button class="btn-primary" on:click={() => goto(`/workplace/${workplace.id}`)}>Edit</button>
        <button class="btn-primary" on:click={() => copy_link(workplace)}>
            {selectedWorkplaceId === workplace.id ? 'Copied!' : 'Invite Link'}
        </button>
        <button class="btn-primary" on:click={() => goto(`/request/${workplace.id}`)}>pending requests</button>
    </div>
{/each}
{/if}

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
                class="btn-primary"
                on:click={() => clockIn(workplace)}
                disabled={!isWithinTimeWindow(workplace.id, workplace.rules, $clockInStatuses).allowed}
            >
                {#if clockingIn && !locationError && !successMessage}
                    Clocking In...
                {:else}
                    Clock In
                {/if}
            </button>
            <button class="btn-primary" on:click={() => {showLeaveModal = true; selectedWorkplaceId = workplace.id;}}>Request Leave</button>
        </div>
    {/each}
{/if}

{#if showLeaveModal}
<div class="modal-overlay" on:click|self={() => showLeaveModal = false}>
    <div class="modal-content">
        <h3>Request Leave</h3>
        
        {#if formError}
            <div class="error-message">{formError}</div>
        {/if}
        
        {#if formSuccess}
            <div class="success-message">{formSuccess}</div>
        {/if}

        <form action="?/request_leave" method="POST">
            <input type="hidden" name="workplace_id" value={selectedWorkplaceId} />
            <div class="form-question">
                Date: <input type="date" id="date" name="date" bind:value={date} required min={new Date().toISOString().split('T')[0]} />
            </div>
            <div class="form-question">
                Reason: <input type="text" id="reason" name="reason" bind:value={reason} required maxlength="255"/>
            </div>
            <button type="submit">Submit Request</button>
        </form>
    </div>
</div>
{/if}
