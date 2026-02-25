<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { synosConfig } from "../../modules/synos/config";

    // ── Types ──────────────────────────────────────────────────────────────────
    interface FloorPlan {
        id: string;
        name: string;
        building: string;
        floor: number;
        image_url: string;
        bounds: [[number, number], [number, number]]; // [[lat_sw, lng_sw],[lat_ne, lng_ne]]
        created_at: string;
    }

    interface DeviceLocation {
        device_id: string;
        latitude: number;
        longitude: number;
        accuracy?: number;
        floor?: number;
        timestamp: string;
    }

    // ── State ──────────────────────────────────────────────────────────────────
    let mapContainer: HTMLDivElement;
    let map: any = null; // Leaflet Map instance
    let floorOverlay: any = null; // Leaflet ImageOverlay
    let deviceMarkers: Record<string, any> = {};

    let floorPlans: FloorPlan[] = [];
    let selectedPlanId: string | null = null;
    let deviceLocations: DeviceLocation[] = [];

    let showUploadModal = false;
    let uploading = false;
    let uploadError = "";

    // Upload form state
    let uploadName = "";
    let uploadBuilding = "";
    let uploadFloor = 0;
    let uploadImageUrl = "";
    let uploadBoundsStr = "[[51.49,-0.08],[51.50,-0.07]]";

    const API = synosConfig.current.apiUrl;

    // ── Leaflet async load ─────────────────────────────────────────────────────
    async function initMap() {
        // Leaflet is a regular CJS/ESM module — import dynamically so SSR doesn't break
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");

        map = L.map(mapContainer, {
            center: [51.495, -0.075],
            zoom: 18,
            maxZoom: 25,
        });

        // Tile layer — use localhost tileserver if available, else OSM
        const tileUrl = `${API.replace("/api/v1", "")}/tiles/{z}/{x}/{y}.png`;
        L.tileLayer(tileUrl, {
            attribution: "© Syn OS TileServer",
            maxZoom: 22,
            errorTileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        }).addTo(map);
    }

    // ── Floor plan overlay ─────────────────────────────────────────────────────
    async function applyFloorPlan(plan: FloorPlan) {
        if (!map) return;
        const L = (await import("leaflet")).default;

        if (floorOverlay) {
            floorOverlay.remove();
            floorOverlay = null;
        }

        floorOverlay = L.imageOverlay(plan.image_url, plan.bounds, {
            opacity: 0.75,
            interactive: false,
            className: "synos-floor-overlay",
        }).addTo(map);

        // Fit map to floor plan bounds
        map.fitBounds(plan.bounds, { padding: [20, 20] });
    }

    function removeFlorPlanOverlay() {
        if (floorOverlay) {
            floorOverlay.remove();
            floorOverlay = null;
        }
        selectedPlanId = null;
    }

    // ── Device markers ─────────────────────────────────────────────────────────
    async function updateDeviceMarker(loc: DeviceLocation) {
        if (!map) return;
        const L = (await import("leaflet")).default;

        const icon = L.divIcon({
            className: "",
            html: `<div class="synos-device-dot" title="${loc.device_id}">
               <div class="synos-device-pulse"></div>
             </div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        });

        if (deviceMarkers[loc.device_id]) {
            deviceMarkers[loc.device_id].setLatLng([
                loc.latitude,
                loc.longitude,
            ]);
        } else {
            deviceMarkers[loc.device_id] = L.marker(
                [loc.latitude, loc.longitude],
                { icon },
            )
                .bindPopup(
                    `<b>${loc.device_id}</b><br>Floor: ${loc.floor ?? "?"}<br>${loc.timestamp}`,
                )
                .addTo(map);
        }
    }

    // ── API calls ──────────────────────────────────────────────────────────────
    async function fetchFloorPlans() {
        try {
            const res = await fetch(`${API}/geo/floorplans`);
            if (res.ok) floorPlans = await res.json();
        } catch (e) {
            console.error("Failed to fetch floor plans:", e);
        }
    }

    async function handlePlanSelect(plan: FloorPlan) {
        selectedPlanId = plan.id;
        await applyFloorPlan(plan);
    }

    async function uploadFloorPlan() {
        uploading = true;
        uploadError = "";
        try {
            const bounds = JSON.parse(uploadBoundsStr);
            const body = {
                name: uploadName,
                building: uploadBuilding,
                floor: uploadFloor,
                image_url: uploadImageUrl,
                bounds,
            };
            const res = await fetch(`${API}/geo/floorplan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error(await res.text());
            const created: FloorPlan = await res.json();
            floorPlans = [...floorPlans, created];
            showUploadModal = false;
        } catch (e: any) {
            uploadError = e.message;
        } finally {
            uploading = false;
        }
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    let wsUnsubscribe: (() => void) | null = null;

    onMount(async () => {
        await initMap();
        await fetchFloorPlans();

        // Listen to WebSocket for live device location updates
        const { getSynosAPI } = await import("../../modules/synos/init");
        const api = getSynosAPI();
        if (api && api["socket"]) {
            const sock = api["socket"];
            sock.on("geo:location_update", (data: DeviceLocation) => {
                deviceLocations = [
                    ...deviceLocations.filter(
                        (d) => d.device_id !== data.device_id,
                    ),
                    data,
                ];
                updateDeviceMarker(data);
            });
            wsUnsubscribe = () => sock.off("geo:location_update");
        }
    });

    onDestroy(() => {
        wsUnsubscribe?.();
        map?.remove();
    });

    $: selectedPlan = floorPlans.find((p) => p.id === selectedPlanId);
</script>

<!-- ── Markup ──────────────────────────────────────────────────────────────── -->
<div class="indoor-map-wrapper">
    <!-- Sidebar ---------------------------------------------------------------->
    <aside class="plan-sidebar">
        <div class="sidebar-header">
            <h2>🏢 Indoor Mode</h2>
            <button class="btn-upload" on:click={() => (showUploadModal = true)}
                >+ Floor Plan</button
            >
        </div>

        {#if floorPlans.length === 0}
            <p class="empty-msg">No floor plans uploaded yet.</p>
        {:else}
            <ul class="plan-list">
                {#each floorPlans as plan}
                    <li class="plan-item-wrapper">
                        <button
                            class="plan-item"
                            class:active={selectedPlanId === plan.id}
                            on:click={() => handlePlanSelect(plan)}
                            type="button"
                        >
                            <span class="plan-floor">F{plan.floor}</span>
                            <div class="plan-info">
                                <strong>{plan.name}</strong>
                                <small>{plan.building}</small>
                            </div>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}

        {#if selectedPlanId}
            <button class="btn-clear" on:click={removeFlorPlanOverlay}
                >✕ Clear Overlay</button
            >
        {/if}

        <!-- Live Devices --------------------------------------------------------->
        <div class="devices-panel">
            <h3>📡 Live Devices ({deviceLocations.length})</h3>
            {#each deviceLocations as loc}
                <div class="device-row">
                    <span class="device-dot"></span>
                    <span class="device-id">{loc.device_id}</span>
                    <span class="device-floor">F{loc.floor ?? "?"}</span>
                </div>
            {/each}
            {#if deviceLocations.length === 0}
                <p class="empty-msg">Awaiting device signals...</p>
            {/if}
        </div>
    </aside>

    <!-- Map ------------------------------------------------------------------->
    <div class="map-container" bind:this={mapContainer}></div>

    <!-- Upload Modal ----------------------------------------------------------->
    {#if showUploadModal}
        <div
            class="modal-backdrop"
            role="presentation"
            on:click|self={() => (showUploadModal = false)}
            on:keydown={(e) => e.key === "Escape" && (showUploadModal = false)}
        >
            <div
                class="modal"
                role="dialog"
                aria-modal="true"
                aria-label="Upload Floor Plan"
            >
                <h3>Upload Floor Plan</h3>

                <label
                    >Name<input
                        bind:value={uploadName}
                        placeholder="Ground Floor"
                    /></label
                >
                <label
                    >Building<input
                        bind:value={uploadBuilding}
                        placeholder="HQ Tower"
                    /></label
                >
                <label
                    >Floor<input
                        type="number"
                        bind:value={uploadFloor}
                    /></label
                >
                <label
                    >Image URL<input
                        bind:value={uploadImageUrl}
                        placeholder="https://..."
                    /></label
                >
                <label>
                    Bounds (JSON)<br />
                    <small>[[lat_sw, lng_sw], [lat_ne, lng_ne]]</small>
                    <textarea bind:value={uploadBoundsStr} rows="2"></textarea>
                </label>

                {#if uploadError}
                    <p class="error">{uploadError}</p>
                {/if}

                <div class="modal-actions">
                    <button
                        class="btn-cancel"
                        on:click={() => (showUploadModal = false)}
                        >Cancel</button
                    >
                    <button
                        class="btn-submit"
                        on:click={uploadFloorPlan}
                        disabled={uploading}
                    >
                        {uploading ? "Uploading…" : "Upload"}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<!-- ── Styles ─────────────────────────────────────────────────────────────── -->
<style>
    .indoor-map-wrapper {
        display: flex;
        height: 100%;
        width: 100%;
        background: #0a0c10;
        color: #c8d3e0;
        font-family: "Fira Code", monospace;
        overflow: hidden;
    }

    /* Sidebar */
    .plan-sidebar {
        width: 240px;
        min-width: 200px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px 12px;
        border-right: 1px solid rgba(0, 200, 255, 0.15);
        background: rgba(0, 20, 40, 0.8);
        overflow-y: auto;
    }

    .sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
    }

    .sidebar-header h2 {
        margin: 0;
        font-size: 0.9rem;
        color: #00c8ff;
        text-shadow: 0 0 8px rgba(0, 200, 255, 0.5);
    }

    .btn-upload {
        background: rgba(0, 200, 255, 0.15);
        border: 1px solid rgba(0, 200, 255, 0.4);
        color: #00c8ff;
        padding: 4px 8px;
        font-size: 0.7rem;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
    }
    .btn-upload:hover {
        background: rgba(0, 200, 255, 0.3);
    }

    .plan-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .plan-item-wrapper {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .plan-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 6px;
        border: 1px solid rgba(0, 200, 255, 0.1);
        cursor: pointer;
        transition:
            background 0.2s,
            border-color 0.2s;
        width: 100%;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
    }
    .plan-item:hover {
        background: rgba(0, 200, 255, 0.08);
    }
    .plan-item.active {
        background: rgba(0, 200, 255, 0.15);
        border-color: rgba(0, 200, 255, 0.5);
    }

    .plan-floor {
        background: rgba(0, 200, 255, 0.2);
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 0.7rem;
        color: #00c8ff;
        font-weight: 700;
    }

    .plan-info strong {
        display: block;
        font-size: 0.8rem;
    }
    .plan-info small {
        color: #5a7080;
        font-size: 0.7rem;
    }

    .btn-clear {
        background: rgba(255, 60, 80, 0.15);
        border: 1px solid rgba(255, 60, 80, 0.4);
        color: #ff3c50;
        padding: 6px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75rem;
        width: 100%;
    }
    .btn-clear:hover {
        background: rgba(255, 60, 80, 0.3);
    }

    /* Devices */
    .devices-panel h3 {
        font-size: 0.8rem;
        color: #00ffaa;
        margin: 0 0 8px;
    }

    .device-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        font-size: 0.75rem;
        border-bottom: 1px solid rgba(0, 255, 170, 0.08);
    }

    .device-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #00ffaa;
        box-shadow: 0 0 6px #00ffaa;
        flex-shrink: 0;
    }

    .device-id {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .device-floor {
        color: #00c8ff;
        font-size: 0.7rem;
    }

    .empty-msg {
        color: #3a5060;
        font-size: 0.75rem;
        font-style: italic;
    }

    /* Map */
    .map-container {
        flex: 1;
        z-index: 0;
    }

    /* Modal */
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .modal {
        background: #0d1a2a;
        border: 1px solid rgba(0, 200, 255, 0.3);
        border-radius: 10px;
        padding: 24px;
        width: 360px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 0 30px rgba(0, 200, 255, 0.15);
    }

    .modal h3 {
        margin: 0 0 4px;
        color: #00c8ff;
        font-size: 1rem;
    }

    .modal label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.78rem;
        color: #8a9ab0;
    }

    .modal input,
    .modal textarea {
        background: rgba(0, 200, 255, 0.05);
        border: 1px solid rgba(0, 200, 255, 0.2);
        border-radius: 5px;
        padding: 6px 10px;
        color: #c8d3e0;
        font-family: inherit;
        font-size: 0.8rem;
        outline: none;
        resize: vertical;
    }
    .modal input:focus,
    .modal textarea:focus {
        border-color: rgba(0, 200, 255, 0.5);
        box-shadow: 0 0 8px rgba(0, 200, 255, 0.2);
    }

    .modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    }

    .btn-cancel {
        background: transparent;
        border: 1px solid #3a5060;
        color: #8a9ab0;
        padding: 7px 14px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 0.8rem;
    }

    .btn-submit {
        background: rgba(0, 200, 255, 0.2);
        border: 1px solid rgba(0, 200, 255, 0.5);
        color: #00c8ff;
        padding: 7px 14px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 0.8rem;
        transition: background 0.2s;
    }
    .btn-submit:hover:not(:disabled) {
        background: rgba(0, 200, 255, 0.35);
    }
    .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .error {
        color: #ff3c50;
        font-size: 0.78rem;
    }

    /* Global: Leaflet floor overlay pulse device dot */
    :global(.synos-floor-overlay) {
        mix-blend-mode: screen;
    }

    :global(.synos-device-dot) {
        width: 16px;
        height: 16px;
        background: #00ffaa;
        border-radius: 50%;
        position: relative;
        box-shadow: 0 0 8px #00ffaa;
    }

    :global(.synos-device-pulse) {
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 2px solid #00ffaa;
        animation: pulse 1.5s ease-out infinite;
    }

    @keyframes pulse {
        0% {
            transform: scale(1);
            opacity: 0.8;
        }
        100% {
            transform: scale(2.5);
            opacity: 0;
        }
    }
</style>
