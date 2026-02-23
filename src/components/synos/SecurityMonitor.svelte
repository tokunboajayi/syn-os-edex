<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { synosClient } from "../../stores/synos/client";

    // Security data
    let securityScore = 0;
    let scoreStatus = "loading";
    let scans = [];
    let isScanning = false;
    let targetInput = "192.168.1.1"; // Default target

    // Polling interval removed
    let cleanupWS;

    async function fetchSecurityData() {
        try {
            // Fetch past scans for initial state
            const scanData = await synosClient.getScans();
            scans = scanData.reverse(); // Newest first
            updateScore();
        } catch (error) {
            console.error("Error fetching security data:", error);
        }
    }

    function updateScore() {
        if (scans.length > 0) {
            const lastScan = scans[0];
            if (lastScan.vulnerability_report) {
                const risk = lastScan.vulnerability_report.risk_score;
                securityScore = Math.max(0, 100 - risk * 10);
                scoreStatus =
                    risk > 7 ? "critical" : risk > 4 ? "warning" : "good";
            } else {
                securityScore = 100;
                scoreStatus = "excellent";
            }
        } else {
            securityScore = 100;
            scoreStatus = "no data";
        }
    }

    async function startScan() {
        if (isScanning) return;
        isScanning = true;
        try {
            // We don't await result here, we wait for WS event
            await synosClient.startNetworkScan(targetInput);
        } catch (error) {
            console.error("Error starting scan:", error);
            isScanning = false;
        }
    }

    function getSeverityColor(score: number): string {
        if (score >= 8) return "#ff0040"; // Critical
        if (score >= 5) return "#ff6b00"; // High
        if (score >= 3) return "#ffa500"; // Medium
        return "#00ff88"; // Low/Safe
    }

    function getStatusColor(status: string): string {
        switch (status) {
            case "excellent":
                return "#00ff88";
            case "good":
                return "#00d4ff";
            case "warning":
                return "#ffa500";
            case "critical":
                return "#ff0040";
            default:
                return "#666";
        }
    }

    onMount(async () => {
        await fetchSecurityData();

        // Listen for new scans
        try {
            cleanupWS = synosClient.onSecurityScanComplete((scan) => {
                console.log("New scan received via WS:", scan);
                scans = [scan, ...scans];
                updateScore();
                isScanning = false;
            });
        } catch (e) {
            console.warn("WS setup failed:", e);
        }
    });

    onDestroy(() => {
        if (cleanupWS) cleanupWS();
    });
</script>

<div class="security-monitor">
    <div class="header">
        <h2>Security Monitor</h2>
        <div class="scan-controls">
            <input
                type="text"
                class="target-input"
                bind:value={targetInput}
                placeholder="Target IP (e.g. 192.168.1.1)"
            />
            <button
                class="scan-button"
                on:click={startScan}
                disabled={isScanning}
            >
                <span class="icon">{isScanning ? "⏳" : "🔍"}</span>
                {isScanning ? "Scanning..." : "Scan Network"}
            </button>
        </div>
    </div>

    <!-- Security Score -->
    <div class="score-section">
        <div
            class="score-circle"
            style="border-color: {getStatusColor(scoreStatus)}"
        >
            <div
                class="score-value"
                style="color: {getStatusColor(scoreStatus)}"
            >
                {Math.round(securityScore)}
            </div>
            <div class="score-label">SecScore</div>
        </div>
        <div class="score-status" style="color: {getStatusColor(scoreStatus)}">
            {scoreStatus.toUpperCase()}
        </div>
    </div>

    <!-- Scan History -->
    <div class="alerts-section">
        <h3>Recent Network Scans</h3>
        <div class="alerts-list">
            {#if scans.length === 0}
                <div class="no-alerts">No scans performed yet.</div>
            {:else}
                {#each scans as scan}
                    <div
                        class="alert-item"
                        style="border-left-color: {scan.vulnerability_report
                            ? getSeverityColor(
                                  scan.vulnerability_report.risk_score,
                              )
                            : '#00d4ff'}"
                    >
                        <div class="alert-header">
                            <span
                                class="alert-severity"
                                style="color: {scan.vulnerability_report
                                    ? getSeverityColor(
                                          scan.vulnerability_report.risk_score,
                                      )
                                    : '#00d4ff'}"
                            >
                                IP: {scan.target}
                            </span>
                            <span class="alert-time"
                                >{new Date(
                                    scan.timestamp,
                                ).toLocaleTimeString()}</span
                            >
                        </div>

                        <div class="alert-description">
                            <div>
                                Ports: {scan.results
                                    .map((r) => r.port)
                                    .join(", ") || "None"}
                            </div>
                            {#if scan.vulnerability_report}
                                <div
                                    style="color: {getSeverityColor(
                                        scan.vulnerability_report.risk_score,
                                    )}"
                                >
                                    Risk: {scan.vulnerability_report.risk_score.toFixed(
                                        1,
                                    )}/10 | {scan.vulnerability_report
                                        .criticality}
                                </div>
                                {#if scan.vulnerability_report.likely_cves.length > 0}
                                    <div class="cve-list">
                                        CVEs: {scan.vulnerability_report.likely_cves.join(
                                            ", ",
                                        )}
                                    </div>
                                {/if}
                            {/if}
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
</div>

<style>
    .security-monitor {
        background: rgba(10, 14, 39, 0.8);
        border: 1px solid #00d4ff;
        border-radius: 8px;
        padding: 20px;
        color: #ffffff;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        gap: 20px;
    }

    .scan-controls {
        display: flex;
        gap: 10px;
        flex: 1;
        justify-content: flex-end;
    }

    .target-input {
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid #00d4ff;
        color: #00d4ff;
        padding: 8px;
        border-radius: 4px;
        font-family: inherit;
        width: 200px;
    }

    .header h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #00d4ff;
        text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
    }

    .scan-button {
        background: linear-gradient(135deg, #00d4ff, #0099cc);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s;
    }

    .scan-button:hover {
        box-shadow: 0 0 15px rgba(0, 212, 255, 0.6);
        transform: translateY(-2px);
    }

    .score-section {
        text-align: center;
        margin-bottom: 30px;
    }

    .score-circle {
        width: 150px;
        height: 150px;
        border: 4px solid;
        border-radius: 50%;
        margin: 0 auto 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
    }

    .score-value {
        font-size: 3rem;
        font-weight: bold;
    }

    .score-label {
        font-size: 0.8rem;
        color: #888;
        margin-top: -5px;
    }

    .score-status {
        font-size: 1.2rem;
        font-weight: bold;
        letter-spacing: 2px;
    }

    .alerts-section {
        margin-bottom: 20px;
    }

    .alerts-section h3 {
        margin: 0 0 15px 0;
        color: #00d4ff;
        font-size: 1.2rem;
    }

    .alerts-list {
        max-height: 400px;
        overflow-y: auto;
    }

    .no-alerts {
        text-align: center;
        padding: 20px;
        color: #00ff88;
    }

    .alert-item {
        background: rgba(0, 0, 0, 0.3);
        border-left: 4px solid;
        padding: 12px;
        margin-bottom: 10px;
        border-radius: 4px;
        position: relative;
    }

    .alert-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
    }

    .alert-severity {
        font-weight: bold;
        font-size: 0.85rem;
    }

    .alert-time {
        font-size: 0.8rem;
        color: #888;
    }

    .alert-description {
        margin-bottom: 8px;
        font-size: 0.95rem;
    }
</style>
