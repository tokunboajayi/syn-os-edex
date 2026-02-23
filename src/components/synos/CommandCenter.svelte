<script lang="ts">
    import { onMount } from "svelte";
    import { getSynosAPI } from "../../modules/synos/init";

    import SystemMetrics from "./SystemMetrics.svelte";
    import TaskOrchestrator from "./TaskOrchestrator.svelte";
    import SecurityMonitor from "./SecurityMonitor.svelte";
    import MLOptimization from "./MLOptimization.svelte";
    import ClusterStatus from "./ClusterStatus.svelte";
    import GeoDashboard from "./GeoDashboard.svelte";

    // Current active view
    let activeView = "tasks";

    // System time (updated every second for EDEX-UI feel)
    let systemTime = new Date().toISOString();
    let cpuUsage = 0;
    let memUsage = 0;

    const views = [
        { id: "tasks", label: "TASK ORCHESTRATOR", icon: "◉" },
        { id: "security", label: "SECURITY CENTER", icon: "⬢" },
        { id: "geo", label: "GEOSPATIAL INTEL", icon: "⌖" },
        { id: "ml", label: "ML OPTIMIZATION", icon: "◆" },
        { id: "cluster", label: "CLUSTER STATUS", icon: "⬡" },
    ];

    onMount(() => {
        // Update clock every second
        const interval = setInterval(() => {
            systemTime = new Date().toISOString();
        }, 1000);

        // Fetch metrics periodically
        const metricsInterval = setInterval(async () => {
            try {
                const api = getSynosAPI();
                if (api) {
                    const metrics = await api.getKernelMetrics();
                    cpuUsage = metrics.cpu.utilization * 100;
                    memUsage = metrics.memory.utilization * 100;
                }
            } catch (e) {
                // Ignore errors
            }
        }, 2000);

        return () => {
            clearInterval(interval);
            clearInterval(metricsInterval);
        };
    });

    function setActiveView(viewId: string) {
        activeView = viewId;
    }
</script>

<div class="command-center">
    <!-- Top Navigation Bar -->
    <nav class="nav-bar">
        <div class="nav-left">
            <span class="logo">◈ SYN OS</span>
            <span class="version">v1.0.0</span>
        </div>

        <div class="nav-tabs">
            {#each views as view}
                <button
                    class="nav-tab"
                    class:active={activeView === view.id}
                    on:click={() => setActiveView(view.id)}
                >
                    <span class="icon">{view.icon}</span>
                    <span class="label">{view.label}</span>
                </button>
            {/each}
        </div>

        <div class="nav-right">
            <div class="metric">
                <span class="metric-label">CPU</span>
                <span class="metric-value">{cpuUsage.toFixed(1)}%</span>
            </div>
            <div class="metric">
                <span class="metric-label">MEM</span>
                <span class="metric-value">{memUsage.toFixed(1)}%</span>
            </div>
            <span class="timestamp">{systemTime}</span>
        </div>
    </nav>

    <!-- Main Content Area -->
    <div class="main-content">
        <!-- Left Panel: Metrics Always Visible -->
        <aside class="sidebar">
            <SystemMetrics />
        </aside>

        <!-- Center Panel: Active View -->
        <section class="center-panel">
            {#if activeView === "tasks"}
                <TaskOrchestrator />
            {:else if activeView === "security"}
                <SecurityMonitor />
            {:else if activeView === "ml"}
                <MLOptimization />
            {:else if activeView === "cluster"}
                <ClusterStatus />
            {:else if activeView === "geo"}
                <GeoDashboard />
            {/if}
        </section>
    </div>

    <!-- Bottom Status Bar -->
    <footer class="status-bar">
        <span class="status-item">KERNEL: <span class="ok">ONLINE</span></span>
        <span class="status-item"
            >ML ENGINE: <span class="ok">ACTIVE</span></span
        >
        <span class="status-item"
            >SECURITY: <span class="ok">MONITORING</span></span
        >
        <span class="status-item">GEO: <span class="ok">TRACKING</span></span>
        <span class="status-item"
            >CLUSTER: <span class="warn">2 NODES</span></span
        >
    </footer>
</div>

<style>
    .command-center {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #0a0e27;
        color: #00ffff;
        font-family: "Courier New", monospace;
    }

    /* Navigation Bar */
    .nav-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 20px;
        background: linear-gradient(180deg, #000 0%, #0a0e27 100%);
        border-bottom: 2px solid #00ffff;
        box-shadow: 0 4px 20px rgba(0, 255, 255, 0.2);
    }

    .nav-left {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .logo {
        font-size: 1.5em;
        font-weight: bold;
        text-shadow: 0 0 15px #00ffff;
        letter-spacing: 3px;
    }

    .version {
        font-size: 0.7em;
        color: #00ff00;
        background: rgba(0, 255, 0, 0.1);
        padding: 2px 8px;
        border: 1px solid #00ff00;
    }

    .nav-tabs {
        display: flex;
        gap: 5px;
    }

    .nav-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: transparent;
        border: 1px solid #333;
        color: #666;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: inherit;
        font-size: 0.85em;
        letter-spacing: 1px;
    }

    .nav-tab:hover {
        border-color: #00ffff;
        color: #00ffff;
        background: rgba(0, 255, 255, 0.05);
    }

    .nav-tab.active {
        border-color: #00ffff;
        color: #00ffff;
        background: rgba(0, 255, 255, 0.15);
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
    }

    .nav-tab .icon {
        font-size: 1.2em;
    }

    .nav-right {
        display: flex;
        align-items: center;
        gap: 20px;
    }

    .metric {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .metric-label {
        font-size: 0.7em;
        color: #666;
    }

    .metric-value {
        font-size: 1em;
        color: #00ff00;
        text-shadow: 0 0 10px #00ff00;
    }

    .timestamp {
        font-size: 0.8em;
        color: #666;
    }

    /* Main Content */
    .main-content {
        flex: 1;
        display: flex;
        gap: 20px;
        padding: 20px;
        overflow: hidden;
    }

    .sidebar {
        width: 280px;
        flex-shrink: 0;
    }

    .center-panel {
        flex: 1;
        overflow-y: auto;
    }

    /* Status Bar */
    .status-bar {
        display: flex;
        justify-content: center;
        gap: 40px;
        padding: 10px;
        background: #000;
        border-top: 1px solid #00ffff;
        font-size: 0.8em;
    }

    .status-item {
        color: #666;
    }

    .status-item .ok {
        color: #00ff00;
        text-shadow: 0 0 5px #00ff00;
    }

    .status-item .warn {
        color: #ffff00;
        text-shadow: 0 0 5px #ffff00;
    }

    .status-item .error {
        color: #ff0033;
        text-shadow: 0 0 5px #ff0033;
    }
</style>
