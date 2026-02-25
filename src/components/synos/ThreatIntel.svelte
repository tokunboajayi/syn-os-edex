<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { synosConfig } from "../../modules/synos/config";

    // ── Types ──────────────────────────────────────────────────────────────────
    interface IOC {
        type: string;
        value: string;
        severity: "critical" | "high" | "medium" | "low";
        source: string;
        description: string;
        timestamp: string;
    }

    // ── State ──────────────────────────────────────────────────────────────────
    const API = synosConfig.current.apiUrl;

    let feed: IOC[] = [];
    let loading = true;
    let error = "";
    let checkInput = "";
    let checkResult: {
        flagged: boolean;
        severity: string | null;
        value: string;
    } | null = null;
    let checking = false;
    let filterSeverity = "all";
    let pollInterval: ReturnType<typeof setInterval>;

    const SEVERITY_ORDER: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
    };
    const SEVERITY_COLOR: Record<string, string> = {
        critical: "#ff2244",
        high: "#ff8800",
        medium: "#ffcc00",
        low: "#44aaff",
    };
    const TYPE_ICON: Record<string, string> = {
        ip: "🌐",
        domain: "🔗",
        hash: "#️⃣",
        url: "📎",
        unknown: "❓",
    };

    // ── Data fetching ──────────────────────────────────────────────────────────
    async function fetchFeed() {
        try {
            const url =
                filterSeverity === "all"
                    ? `${API}/threat-intel/feed?limit=30`
                    : `${API}/threat-intel/feed?limit=30&severity=${filterSeverity}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: IOC[] = await res.json();
            feed = data.sort(
                (a, b) =>
                    (SEVERITY_ORDER[a.severity] ?? 9) -
                    (SEVERITY_ORDER[b.severity] ?? 9),
            );
            error = "";
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function checkIndicator() {
        if (!checkInput.trim()) return;
        checking = true;
        checkResult = null;
        try {
            const res = await fetch(`${API}/threat-intel/check`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ value: checkInput.trim() }),
            });
            checkResult = await res.json();
        } catch {
            checkResult = null;
        } finally {
            checking = false;
        }
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    onMount(() => {
        fetchFeed();
        pollInterval = setInterval(fetchFeed, 30_000);
    });

    onDestroy(() => clearInterval(pollInterval));

    $: filterSeverity, fetchFeed();
</script>

<div class="threat-intel">
    <div class="header">
        <h2>⚠ Threat Intelligence</h2>
        <div class="controls">
            <select bind:value={filterSeverity} class="severity-filter">
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
            </select>
            <span class="count">{feed.length} IOCs</span>
        </div>
    </div>

    <!-- Check Panel -->
    <div class="check-panel">
        <div class="check-row">
            <input
                class="check-input"
                bind:value={checkInput}
                placeholder="Check IP or domain…"
                on:keydown={(e) => e.key === "Enter" && checkIndicator()}
            />
            <button
                class="check-btn"
                on:click={checkIndicator}
                disabled={checking}
            >
                {checking ? "…" : "Check"}
            </button>
        </div>
        {#if checkResult}
            <div class="check-result" class:flagged={checkResult.flagged}>
                {#if checkResult.flagged}
                    🚨 <strong>{checkResult.value}</strong> is flagged
                    <span
                        class="badge"
                        style="background:{SEVERITY_COLOR[
                            checkResult.severity ?? 'low'
                        ]}">{checkResult.severity}</span
                    >
                {:else}
                    ✅ <strong>{checkResult.value}</strong> — not in threat database
                {/if}
            </div>
        {/if}
    </div>

    <!-- Feed -->
    {#if loading}
        <div class="loading">Loading feed…</div>
    {:else if error}
        <div class="error">⚠ {error}</div>
    {:else if feed.length === 0}
        <div class="empty">No IOCs for selected severity.</div>
    {:else}
        <div class="feed">
            {#each feed as ioc}
                <div class="ioc-row">
                    <span
                        class="sev-bar"
                        style="background:{SEVERITY_COLOR[ioc.severity]}"
                    ></span>
                    <span class="ioc-icon">{TYPE_ICON[ioc.type] ?? "❓"}</span>
                    <span class="ioc-value">{ioc.value}</span>
                    <span
                        class="badge"
                        style="background:{SEVERITY_COLOR[ioc.severity]}"
                        >{ioc.severity}</span
                    >
                    <span class="ioc-source">{ioc.source}</span>
                    <span class="ioc-desc">{ioc.description}</span>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .threat-intel {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: rgba(10, 14, 39, 0.9);
        border: 1px solid #ff2244;
        border-radius: 8px;
        padding: 20px;
        gap: 14px;
        font-family: "Fira Code", monospace;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    h2 {
        margin: 0;
        color: #ff2244;
        text-shadow: 0 0 12px rgba(255, 34, 68, 0.6);
        font-size: 1rem;
    }

    .controls {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .severity-filter {
        background: rgba(255, 34, 68, 0.1);
        border: 1px solid rgba(255, 34, 68, 0.3);
        color: #ff7799;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-family: inherit;
    }

    .count {
        color: #5a6a80;
        font-size: 0.75rem;
    }

    /* Check panel */
    .check-panel {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .check-row {
        display: flex;
        gap: 8px;
    }

    .check-input {
        flex: 1;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 34, 68, 0.25);
        color: #c8d3e0;
        padding: 7px 12px;
        border-radius: 5px;
        font-family: inherit;
        font-size: 0.8rem;
        outline: none;
    }
    .check-input:focus {
        border-color: rgba(255, 34, 68, 0.6);
        box-shadow: 0 0 8px rgba(255, 34, 68, 0.2);
    }

    .check-btn {
        background: rgba(255, 34, 68, 0.2);
        border: 1px solid rgba(255, 34, 68, 0.5);
        color: #ff2244;
        padding: 7px 16px;
        border-radius: 5px;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.8rem;
        transition: background 0.2s;
    }
    .check-btn:hover:not(:disabled) {
        background: rgba(255, 34, 68, 0.35);
    }
    .check-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .check-result {
        padding: 8px 12px;
        border-radius: 5px;
        font-size: 0.8rem;
        background: rgba(0, 255, 80, 0.08);
        border: 1px solid rgba(0, 255, 80, 0.3);
        color: #00ff80;
    }
    .check-result.flagged {
        background: rgba(255, 34, 68, 0.1);
        border-color: rgba(255, 34, 68, 0.4);
        color: #ff7799;
    }

    .badge {
        display: inline-block;
        padding: 1px 7px;
        border-radius: 10px;
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #000;
        margin-left: 4px;
    }

    /* Feed */
    .feed {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .ioc-row {
        display: grid;
        grid-template-columns: 4px 24px 180px 80px 120px 1fr;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.02);
        font-size: 0.75rem;
        transition: background 0.15s;
    }
    .ioc-row:hover {
        background: rgba(255, 34, 68, 0.06);
    }

    .sev-bar {
        width: 4px;
        height: 28px;
        border-radius: 2px;
    }

    .ioc-value {
        font-family: "Fira Code", monospace;
        color: #e0e8f0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .ioc-source {
        color: #4a7090;
        font-size: 0.7rem;
    }

    .ioc-desc {
        color: #7a8a9a;
        font-size: 0.7rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .loading,
    .empty {
        color: #3a5060;
        font-size: 0.8rem;
        text-align: center;
        padding: 20px;
    }
    .error {
        color: #ff6080;
        font-size: 0.8rem;
        text-align: center;
    }

    .feed::-webkit-scrollbar {
        width: 4px;
    }
    .feed::-webkit-scrollbar-track {
        background: transparent;
    }
    .feed::-webkit-scrollbar-thumb {
        background: rgba(255, 34, 68, 0.3);
        border-radius: 2px;
    }
</style>
