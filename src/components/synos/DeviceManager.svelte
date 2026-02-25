<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { synosConfig } from "../../modules/synos/config";

    // ── Types ──────────────────────────────────────────────────────────────────
    interface Device {
        id: string;
        name: string;
        ip: string;
        type: string;
        label: string | null;
        status: "online" | "offline" | "unknown";
        last_seen: number | null;
        registered_at: number;
        meta: Record<string, unknown> | null;
    }

    // ── State ──────────────────────────────────────────────────────────────────
    const API = synosConfig.current.apiUrl;
    const TYPE_ICON: Record<string, string> = {
        workstation: "💻",
        server: "🖥️",
        iot: "📡",
        mobile: "📱",
        generic: "🔌",
    };
    const STATUS_COLOR: Record<string, string> = {
        online: "#00ff80",
        offline: "#ff4455",
        unknown: "#8899aa",
    };

    let devices: Device[] = [];
    let loading = true;
    let error = "";
    let pinging = new Set<string>();
    let showAdd = false;
    let adding = false;
    let addError = "";

    // Form state
    let newName = "";
    let newIp = "";
    let newType = "generic";
    let newLabel = "";

    // ── API helpers ────────────────────────────────────────────────────────────
    async function fetchDevices() {
        try {
            const res = await fetch(`${API}/devices`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            devices = await res.json();
            error = "";
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function pingDevice(id: string) {
        pinging = new Set([...pinging, id]);
        try {
            const res = await fetch(`${API}/devices/${id}/ping`, {
                method: "POST",
            });
            const data = await res.json();
            devices = devices.map((d) =>
                d.id === id ? { ...d, status: data.status } : d,
            );
        } finally {
            pinging = new Set([...pinging].filter((x) => x !== id));
        }
    }

    async function deleteDevice(id: string) {
        if (!confirm("Remove this device?")) return;
        await fetch(`${API}/devices/${id}`, { method: "DELETE" });
        devices = devices.filter((d) => d.id !== id);
    }

    async function addDevice() {
        if (!newName || !newIp) {
            addError = "Name and IP are required";
            return;
        }
        adding = true;
        addError = "";
        try {
            const res = await fetch(`${API}/devices`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newName,
                    ip: newIp,
                    type: newType,
                    label: newLabel || null,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            const created: Device = await res.json();
            devices = [...devices, created];
            showAdd = false;
            newName = "";
            newIp = "";
            newType = "generic";
            newLabel = "";
        } catch (e: any) {
            addError = e.message;
        } finally {
            adding = false;
        }
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    let pollInterval: ReturnType<typeof setInterval>;
    onMount(() => {
        fetchDevices();
        pollInterval = setInterval(fetchDevices, 15_000);
    });
    onDestroy(() => clearInterval(pollInterval));
</script>

<div class="device-manager">
    <div class="header">
        <h2>📡 Device Manager</h2>
        <div class="header-actions">
            <span class="count">{devices.length} registered</span>
            <button class="btn-add" on:click={() => (showAdd = !showAdd)}>
                {showAdd ? "✕ Cancel" : "+ Add Device"}
            </button>
        </div>
    </div>

    <!-- Add Device Form -->
    {#if showAdd}
        <div class="add-form">
            <div class="form-row">
                <input
                    bind:value={newName}
                    placeholder="Name"
                    class="form-input"
                />
                <input
                    bind:value={newIp}
                    placeholder="IP Address"
                    class="form-input"
                />
                <select bind:value={newType} class="form-select">
                    <option value="generic">Generic</option>
                    <option value="workstation">Workstation</option>
                    <option value="server">Server</option>
                    <option value="iot">IoT</option>
                    <option value="mobile">Mobile</option>
                </select>
                <input
                    bind:value={newLabel}
                    placeholder="Label (optional)"
                    class="form-input"
                />
                <button
                    class="btn-submit"
                    on:click={addDevice}
                    disabled={adding}
                >
                    {adding ? "Adding…" : "Register"}
                </button>
            </div>
            {#if addError}<p class="form-error">{addError}</p>{/if}
        </div>
    {/if}

    <!-- Device Table -->
    {#if loading}
        <div class="state-msg">Loading devices…</div>
    {:else if error}
        <div class="state-msg error">⚠ {error}</div>
    {:else if devices.length === 0}
        <div class="state-msg">No devices registered yet.</div>
    {:else}
        <div class="table-wrapper">
            <table class="device-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>Name</th>
                        <th>IP</th>
                        <th>Type</th>
                        <th>Label</th>
                        <th>Status</th>
                        <th>Last Seen</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each devices as dev}
                        <tr>
                            <td class="type-icon"
                                >{TYPE_ICON[dev.type] ?? "🔌"}</td
                            >
                            <td class="dev-name">{dev.name}</td>
                            <td class="dev-ip">{dev.ip}</td>
                            <td class="dev-type">{dev.type}</td>
                            <td class="dev-label">{dev.label ?? "—"}</td>
                            <td>
                                <span
                                    class="status-dot"
                                    style="background:{STATUS_COLOR[
                                        dev.status
                                    ]};
                                           box-shadow: 0 0 6px {STATUS_COLOR[
                                        dev.status
                                    ]}"
                                ></span>
                                <span
                                    class="status-text"
                                    style="color:{STATUS_COLOR[dev.status]}"
                                >
                                    {dev.status}
                                </span>
                            </td>
                            <td class="dev-lastseen">
                                {dev.last_seen
                                    ? new Date(
                                          dev.last_seen * 1000,
                                      ).toLocaleTimeString()
                                    : "—"}
                            </td>
                            <td class="actions">
                                <button
                                    class="action-btn ping"
                                    on:click={() => pingDevice(dev.id)}
                                    disabled={pinging.has(dev.id)}
                                    title="Ping"
                                >
                                    {pinging.has(dev.id) ? "…" : "Ping"}
                                </button>
                                <button
                                    class="action-btn remove"
                                    on:click={() => deleteDevice(dev.id)}
                                    title="Remove"
                                >
                                    ✕
                                </button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .device-manager {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: rgba(10, 14, 39, 0.9);
        border: 1px solid #00c8ff;
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
        color: #00c8ff;
        text-shadow: 0 0 10px rgba(0, 200, 255, 0.5);
        font-size: 1rem;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .count {
        color: #4a6a80;
        font-size: 0.75rem;
    }

    .btn-add {
        background: rgba(0, 200, 255, 0.15);
        border: 1px solid rgba(0, 200, 255, 0.4);
        color: #00c8ff;
        padding: 5px 12px;
        border-radius: 5px;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.75rem;
        transition: background 0.2s;
    }
    .btn-add:hover {
        background: rgba(0, 200, 255, 0.28);
    }

    /* Add form */
    .add-form {
        background: rgba(0, 200, 255, 0.04);
        border: 1px solid rgba(0, 200, 255, 0.15);
        border-radius: 6px;
        padding: 12px;
    }

    .form-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .form-input,
    .form-select {
        flex: 1;
        min-width: 120px;
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(0, 200, 255, 0.2);
        color: #c8d3e0;
        padding: 6px 10px;
        border-radius: 4px;
        font-family: inherit;
        font-size: 0.78rem;
        outline: none;
    }
    .form-input:focus,
    .form-select:focus {
        border-color: rgba(0, 200, 255, 0.5);
    }

    .btn-submit {
        background: rgba(0, 200, 255, 0.2);
        border: 1px solid rgba(0, 200, 255, 0.5);
        color: #00c8ff;
        padding: 6px 14px;
        border-radius: 4px;
        cursor: pointer;
        font-family: inherit;
        font-size: 0.78rem;
    }
    .btn-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .form-error {
        color: #ff4455;
        font-size: 0.75rem;
        margin: 6px 0 0;
    }

    /* Table */
    .table-wrapper {
        flex: 1;
        overflow-y: auto;
    }

    .device-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.78rem;
    }

    thead th {
        color: #4a6a80;
        text-align: left;
        padding: 6px 10px;
        border-bottom: 1px solid rgba(0, 200, 255, 0.12);
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    tbody tr {
        border-bottom: 1px solid rgba(0, 200, 255, 0.06);
        transition: background 0.15s;
    }
    tbody tr:hover {
        background: rgba(0, 200, 255, 0.04);
    }

    td {
        padding: 8px 10px;
        color: #c8d3e0;
    }

    .type-icon {
        font-size: 1rem;
    }
    .dev-name {
        font-weight: 600;
        color: #e0e8f0;
    }
    .dev-ip {
        color: #00c8ff;
        font-family: "Fira Code", monospace;
    }
    .dev-type {
        color: #5a8090;
        font-size: 0.72rem;
    }
    .dev-label {
        color: #5a8090;
        font-size: 0.72rem;
    }
    .dev-lastseen {
        color: #4a6070;
        font-size: 0.7rem;
    }

    .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 5px;
        vertical-align: middle;
    }
    .status-text {
        font-size: 0.72rem;
        vertical-align: middle;
    }

    .actions {
        display: flex;
        gap: 6px;
    }

    .action-btn {
        padding: 3px 10px;
        border-radius: 4px;
        font-family: inherit;
        font-size: 0.7rem;
        cursor: pointer;
        border: 1px solid;
        transition: background 0.15s;
    }
    .action-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .action-btn.ping {
        background: rgba(0, 200, 255, 0.1);
        border-color: rgba(0, 200, 255, 0.3);
        color: #00c8ff;
    }
    .action-btn.ping:hover:not(:disabled) {
        background: rgba(0, 200, 255, 0.22);
    }

    .action-btn.remove {
        background: rgba(255, 68, 85, 0.1);
        border-color: rgba(255, 68, 85, 0.3);
        color: #ff4455;
    }
    .action-btn.remove:hover {
        background: rgba(255, 68, 85, 0.22);
    }

    .state-msg {
        color: #3a5060;
        font-size: 0.8rem;
        text-align: center;
        padding: 20px;
    }
    .state-msg.error {
        color: #ff6080;
    }

    .table-wrapper::-webkit-scrollbar {
        width: 4px;
    }
    .table-wrapper::-webkit-scrollbar-track {
        background: transparent;
    }
    .table-wrapper::-webkit-scrollbar-thumb {
        background: rgba(0, 200, 255, 0.25);
        border-radius: 2px;
    }
</style>
