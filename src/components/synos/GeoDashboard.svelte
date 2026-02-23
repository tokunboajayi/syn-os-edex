<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import L from "leaflet";
    import "leaflet/dist/leaflet.css";
    import { synosClient } from "../../stores/synos/client";
    import IndoorMap from "./IndoorMap.svelte";

    let indoorMode = false;

    let mapElement: HTMLElement;
    let map: L.Map;
    let locationInterval: any;
    let deviceId = "synos-device-01"; // Hardcoded for demo

    let pathLayer: L.LayerGroup;
    let predictedLayer: L.LayerGroup;
    let markerLayer: L.LayerGroup;

    // Custom sci-fi marker icon
    const createMarkerIcon = (color: string) =>
        L.divIcon({
            className: "custom-marker",
            html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px ${color}; border: 2px solid white;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
        });

    let cleanupWS: () => void;

    async function updateMap() {
        if (!map) return;

        try {
            const prediction = await synosClient.predictPath(deviceId);

            // Clear layers
            pathLayer.clearLayers();
            predictedLayer.clearLayers();
            markerLayer.clearLayers();

            // Predicted Path
            if (
                prediction.future_points &&
                prediction.future_points.length > 0
            ) {
                const latlngs = prediction.future_points.map((p) => [
                    p[0],
                    p[1],
                ]);
                L.polyline(latlngs, {
                    color: "#00ffff",
                    dashArray: "5, 10",
                    weight: 3,
                    opacity: 0.8,
                }).addTo(predictedLayer);

                // Add end marker
                const lastPoint = latlngs[latlngs.length - 1];
                L.marker(lastPoint, { icon: createMarkerIcon("#00ffff") })
                    .addTo(markerLayer)
                    .bindPopup("Predicted Location (+5m)");
            }
        } catch (e) {
            console.error("Error updating map:", e);
        }
    }

    function updateCurrentLocation(lat, lng) {
        if (!map) return;

        // Add marker for current location
        L.marker([lat, lng], { icon: createMarkerIcon("#00ff00") })
            .addTo(markerLayer)
            .bindPopup("Target Acquired: ACTIVE");

        map.panTo([lat, lng]);
    }

    onMount(async () => {
        if (mapElement) {
            map = L.map(mapElement).setView([40.7128, -74.006], 13);

            L.tileLayer(
                "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                {
                    attribution: "&copy; OpenStreetMap &copy; CARTO",
                    subdomains: "abcd",
                    maxZoom: 19,
                },
            ).addTo(map);

            pathLayer = L.layerGroup().addTo(map);
            predictedLayer = L.layerGroup().addTo(map);
            markerLayer = L.layerGroup().addTo(map);

            // Initial update
            updateMap();

            // WebSocket Listeners
            try {
                cleanupWS = synosClient.onGeoLocationUpdate((loc) => {
                    console.log("Geo update via WS:", loc);
                    if (loc.latitude && loc.longitude) {
                        updateCurrentLocation(loc.latitude, loc.longitude);
                        // Trigger prediction update when location changes
                        updateMap();
                    }
                });
            } catch (e) {
                console.warn("WS setup failed:", e);
                // Fallback polling
                locationInterval = setInterval(updateMap, 5000);
            }
        }
    });

    onDestroy(() => {
        if (map) map.remove();
        if (cleanupWS) cleanupWS();
        if (locationInterval) clearInterval(locationInterval);
    });
</script>

<div class="geo-dashboard">
    <div class="header">
        <h2>Geospatial Intelligence</h2>
        <div class="status">
            <span class="label">GPS:</span> <span class="value ok">LOCKED</span>
            <span class="label">AI PREDICTION:</span>
            <span class="value ok">ACTIVE</span>
        </div>
        <!-- Mode toggle -->
        <div class="mode-tabs">
            <button
                class="tab"
                class:active={!indoorMode}
                on:click={() => {
                    indoorMode = false;
                }}>🌍 Outdoor</button
            >
            <button
                class="tab"
                class:active={indoorMode}
                on:click={() => {
                    indoorMode = true;
                }}>🏢 Indoor</button
            >
        </div>
    </div>

    <!-- Keep outdoor map in DOM so Leaflet doesn't lose state -->
    <div
        class="map-container"
        bind:this={mapElement}
        style:display={indoorMode ? "none" : "flex"}
    ></div>

    {#if indoorMode}
        <div class="map-container indoor-wrapper">
            <IndoorMap />
        </div>
    {/if}
</div>

<style>
    .geo-dashboard {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: rgba(10, 14, 39, 0.8);
        border: 1px solid #00ffff;
        border-radius: 8px;
        padding: 20px;
    }

    .mode-tabs {
        display: flex;
        gap: 6px;
        margin-left: auto;
    }

    .tab {
        background: transparent;
        border: 1px solid rgba(0, 255, 255, 0.25);
        color: #5a8090;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75rem;
        font-family: "Courier New", monospace;
        transition: all 0.2s;
    }
    .tab:hover {
        border-color: rgba(0, 255, 255, 0.6);
        color: #00ffff;
    }
    .tab.active {
        background: rgba(0, 255, 255, 0.15);
        border-color: #00ffff;
        color: #00ffff;
    }

    .indoor-wrapper {
        padding: 0;
        overflow: hidden;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    h2 {
        margin: 0;
        color: #00ffff;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
    }

    .status {
        font-size: 0.8em;
    }

    .label {
        color: #666;
        margin-left: 15px;
    }

    .value.ok {
        color: #00ff00;
        text-shadow: 0 0 5px #00ff00;
    }

    .map-container {
        flex: 1;
        background: #000;
        border: 1px solid #333;
        border-radius: 4px;
        min-height: 400px;
    }

    /* Leaflet Overrides for Dark Mode */
    :global(.leaflet-container) {
        background: #090909;
        font-family: "Courier New", monospace;
    }
    :global(.leaflet-popup-content-wrapper),
    :global(.leaflet-popup-tip) {
        background: rgba(0, 20, 40, 0.9);
        color: #00ffff;
        border: 1px solid #00ffff;
        border-radius: 0;
    }
</style>
