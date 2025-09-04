<script>
    import {PUBLIC_GOOGLE_CLIENT_ID, PUBLIC_GOOGLE_PROJECT_NUMBER} from '$env/static/public';
    import { onMount } from 'svelte';
    export let data;
    const workplace = data.workplace;
    // Create a deep copy of emails that's not reactive to workplace changes
    let emails = JSON.parse(JSON.stringify([
        ...(workplace?.expand?.employees?.map(e => e.email) || []),
        ...(data.invitations?.map(i => i.email) || [])
    ]));
    let currentEmail = '';
    let selectedFile = workplace?.file_id ? { id: workplace.file_id, name: 'Selected file' } : null;
    let showPicker = false;
    let pickerElement;

    // Default to Phnom Penh coordinates    
    let lat = workplace?.location?.lat || 11.5564;
    let lon = workplace?.location?.lon || 104.9282;
    let map;
    let marker;
    let L;

    onMount(async () => {
        await import('@googleworkspace/drive-picker-element');
        // Try to get user's current location
        if (data.id == "new") {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    lat = position.coords.latitude;
                    lon = position.coords.longitude;
                    // Update the map if it's already initialized
                    if (map) {
                        map.setView([lat, lon], 13);
                        if (marker) {
                            marker.setLatLng([lat, lon]);
                        } else {
                            marker = L.marker([lat, lon]).addTo(map);
                        }
                    }
                },
                (error) => {
                    console.error("Error getting location:", error);
                    // Fall back to workplace location if available
                    if (workplace?.location?.lat && workplace?.location?.lon) {
                        lat = workplace.location.lat;
                        lon = workplace.location.lon;
                    }
                }
            );
        }

        L = (await import('leaflet')).default;

        // Load CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        map = L.map('map').setView([lat, lon], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: ' OpenStreetMap contributors'
        }).addTo(map);

        marker = L.marker([lat, lon], {
            icon: L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                shadowSize: [41, 41]
            })
        }).addTo(map);

        map.on('click', (e) => {
            lat = e.latlng.lat;
            lon = e.latlng.lng;
            marker.setLatLng([lat, lon]);
        });
    });

    $: if (L && map && lat !== undefined && lon !== undefined) {
        map.setView([lat, lon], 13);
        marker.setLatLng([lat, lon]);
    }

    function addEmail(event) {
        if (event.key !== 'Enter' || emails.length >= data.free_spot) {
            return;
        }
        event.preventDefault();
        if (emails.includes(currentEmail.trim()))
            return;
        if (!currentEmail.includes('@'))
            return;
        if (currentEmail.trim()) {
            emails = [...emails, currentEmail.trim()];
            currentEmail = '';
        }
    }

    function removeEmail(index) {
        emails = emails.filter((_, i) => i !== index);
    }

    function confirmDelete(e) {
        if (!confirm('Are you sure you want to delete this workplace? This action cannot be undone.')) {
            e.preventDefault();
        }
    }

    function handlePicked(event) {
        selectedFile = event.detail.docs[0];
        showPicker = false;
    }

    function handleCanceled(event) {
        showPicker = false;
    }
</script>
{#if data.id && data.id != "new"}
<div class="form-actions">
    <form action="?/delete" method="POST" on:submit={confirmDelete} style="display: inline;">
        <button class="btn-secondary" type="submit">Delete</button>
    </form>
</div>
{/if}
<form action="?/upsert" method="POST">
    <div class="form-question">
        <label class="question-title" for="name">Workplace Name:</label>
        <input class="question-input" id="name" name="name" maxlength="255" required value={workplace?.name || ''} placeholder="Enter workplace name" />
    </div>

    <div class="form-question">
        <label class="question-title">Select Spreadsheet:</label>
        <button class="btn-secondary" type="button" on:click={() => showPicker = true}>Select File</button>
        {#if selectedFile}
            <p>Selected: {selectedFile.name}</p>
        {/if}
    </div>

    {#if showPicker}
    <drive-picker
        bind:this={pickerElement}
        client-id="{PUBLIC_GOOGLE_CLIENT_ID}"
        app-id="{PUBLIC_GOOGLE_PROJECT_NUMBER}"
        login-hint="{data.user.email}"
        on:picker:picked={handlePicked}
        on:picker:canceled={handleCanceled}
        >
        <drive-picker-docs-view owned-by-me="true"
            mime-types="application/vnd.google-apps.spreadsheet"></drive-picker-docs-view>
    </drive-picker>
    {/if}

    <input type="hidden" name="emails" value={JSON.stringify(emails)} />
    <input type="hidden" name="lat" value={lat} />
    <input type="hidden" name="lon" value={lon} />
    <input type="hidden" name="file_id" value={selectedFile?.id || ''} />

    <div class="form-section">
        <h2>Add employees</h2>
        <p>Remaining spots: {Math.max(0, data.free_spot - emails.length)} of {data.free_spot}</p>
        <div class="form-question">
            <label class="question-title" for="email">Email:</label>
            <input
                class="question-input"
                id="email"
                type="email"
                bind:value={currentEmail}
                on:keydown={addEmail}
                placeholder={emails.length >= data.free_spot ? 'No more spots available' : 'Enter email address and press Enter'}
                readonly={emails.length >= data.free_spot}
            />
        </div>
        <ul>
            {#each emails as email, index}
                <li class="employee-item">
                    <span>{email}</span>
                    <button class="btn-secondary" on:click={() => removeEmail(index)}>Remove</button>
                </li>
            {/each}
        </ul>
    </div>

    <div class="form-question">
        <label class="question-title" for="proximity">Proximity (m):</label>
        <input class="question-input" id="proximity" name="proximity" type="number" min="10" max="1000" required value={workplace?.proximity || 10} />
    </div>

    <div class="form-section">
        <h2>Select Location</h2>
        <div id="map" class="map-container"></div>
    </div>

    <div class="form-actions">
        <button class="btn-primary" type="submit">Save Changes</button>
    </div>
</form>