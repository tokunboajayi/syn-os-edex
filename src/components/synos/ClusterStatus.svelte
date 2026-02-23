<script lang="ts">
    import { onMount } from "svelte";
    import { getSynosAPI } from "../../modules/synos/init";

    interface ClusterNode {
        id: string;
        name: string;
        ip: string;
        status: "healthy" | "degraded" | "offline";
        cpu: number;
        memory: number;
        uptime: number;
    }

    let nodes: ClusterNode[] = [];
    let selectedNode: ClusterNode | null = null;
    let clusterMetrics = {
        totalNodes: 0,
        healthyNodes: 0,
        degradedNodes: 0,
        offlineNodes: 0,
    };

    onMount(async () => {
        // Mock data for visualization
        nodes = [
            {
                id: "1",
                name: "node-01",
                ip: "192.168.1.10",
                status: "healthy",
                cpu: 45,
                memory: 62,
                uptime: 86400,
            },
            {
                id: "2",
                name: "node-02",
                ip: "192.168.1.11",
                status: "healthy",
                cpu: 38,
                memory: 55,
                uptime: 86400,
            },
            {
                id: "3",
                name: "node-03",
                ip: "192.168.1.12",
                status: "degraded",
                cpu: 89,
                memory: 92,
                uptime: 43200,
            },
            {
                id: "4",
                name: "node-04",
                ip: "192.168.1.13",
                status: "healthy",
                cpu: 52,
                memory: 68,
                uptime: 86400,
            },
        ];

        updateMetrics();
    });

    function updateMetrics() {
        clusterMetrics.totalNodes = nodes.length;
        clusterMetrics.healthyNodes = nodes.filter(
            (n) => n.status === "healthy",
        ).length;
        clusterMetrics.degradedNodes = nodes.filter(
            (n) => n.status === "degraded",
        ).length;
        clusterMetrics.offlineNodes = nodes.filter(
            (n) => n.status === "offline",
        ).length;
    }

    function formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        if (days > 0) return `${days}d ${hours}h`;
        return `${hours}h`;
    }
</script>

<div class="cluster-status">
    <h2>CLUSTER STATUS</h2>

    <div class="cluster-overview">
        <div class="cluster-stat">
            <span class="label">Total Nodes</span>
            <span class="value">{clusterMetrics.totalNodes}</span>
        </div>
        <div class="cluster-stat">
            <span class="label">Healthy</span>
            <span class="value healthy">{clusterMetrics.healthyNodes}</span>
        </div>
        <div class="cluster-stat">
            <span class="label">Degraded</span>
            <span class="value warning">{clusterMetrics.degradedNodes}</span>
        </div>
        <div class="cluster-stat">
            <span class="label">Offline</span>
            <span class="value critical">{clusterMetrics.offlineNodes}</span>
        </div>
    </div>

    <div class="nodes-visualization">
        <h3>NODE TOPOLOGY</h3>
        <div class="nodes-grid">
            {#each nodes as node (node.id)}
                <div
                    class="node-box status-{node.status}"
                    role="button"
                    tabindex="0"
                    on:click={() => (selectedNode = node)}
                    on:keypress={(e) =>
                        e.key === "Enter" && (selectedNode = node)}
                    class:selected={selectedNode?.id === node.id}
                >
                    <div class="node-icon">◆</div>
                    <div class="node-name">{node.name}</div>
                    <div class="node-ip">{node.ip}</div>
                    <div class="node-metrics">
                        <span>CPU: {node.cpu}%</span>
                        <span>RAM: {node.memory}%</span>
                    </div>
                </div>
            {/each}
        </div>
    </div>

    {#if selectedNode}
        <div class="node-details">
            <h3>NODE: {selectedNode.name.toUpperCase()}</h3>
            <div class="details-grid">
                <div>
                    <strong>IP Address:</strong>
                    {selectedNode.ip}
                </div>
                <div>
                    <strong>Status:</strong>
                    <span
                        style="color: {selectedNode.status === 'healthy'
                            ? '#00ff00'
                            : '#ffff00'}"
                    >
                        {selectedNode.status}
                    </span>
                </div>
                <div>
                    <strong>CPU Usage:</strong>
                    {selectedNode.cpu}%
                </div>
                <div>
                    <strong>Memory Usage:</strong>
                    {selectedNode.memory}%
                </div>
                <div>
                    <strong>Uptime:</strong>
                    {formatUptime(selectedNode.uptime)}
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .cluster-status {
        padding: 20px;
        border: 1px solid #ff6600;
        box-shadow: 0 0 10px rgba(255, 102, 0, 0.3);
        background: rgba(0, 0, 0, 0.8);
    }

    h2 {
        color: #ff6600;
        font-size: 1.2em;
        letter-spacing: 2px;
        margin-bottom: 15px;
        text-transform: uppercase;
        text-shadow: 0 0 10px #ff6600;
    }

    .cluster-overview {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 20px;
    }

    .cluster-stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px;
        border: 1px solid #ff6600;
        background: rgba(255, 102, 0, 0.1);
    }

    .label {
        color: #999;
        font-size: 0.8em;
    }

    .value {
        color: #ff6600;
        font-size: 1.8em;
        font-weight: bold;
        text-shadow: 0 0 10px #ff6600;
    }

    .value.healthy {
        color: #00ff00;
        text-shadow: 0 0 10px #00ff00;
    }

    .value.warning {
        color: #ffff00;
        text-shadow: 0 0 10px #ffff00;
    }

    .value.critical {
        color: #ff0033;
        text-shadow: 0 0 10px #ff0033;
    }

    .nodes-visualization h3 {
        color: #ff6600;
        margin-bottom: 15px;
    }

    .nodes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 10px;
    }

    .node-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 15px;
        border: 2px solid #666;
        background: rgba(0, 0, 0, 0.6);
        cursor: pointer;
        transition: all 0.3s;
    }

    .node-box.status-healthy {
        border-color: #00ff00;
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
    }

    .node-box.status-degraded {
        border-color: #ffff00;
        box-shadow: 0 0 10px rgba(255, 255, 0, 0.2);
    }

    .node-box.status-offline {
        border-color: #ff0033;
        box-shadow: 0 0 10px rgba(255, 0, 51, 0.2);
        opacity: 0.6;
    }

    .node-box.selected {
        box-shadow: 0 0 20px rgba(255, 102, 0, 0.5);
    }

    .node-icon {
        font-size: 2em;
        margin-bottom: 5px;
        color: #ff6600;
    }

    .node-name {
        font-weight: bold;
        color: #00ffff;
        margin-bottom: 3px;
    }

    .node-ip {
        color: #999;
        font-size: 0.8em;
        margin-bottom: 8px;
    }

    .node-metrics {
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 0.8em;
        color: #00ff00;
    }

    .node-details {
        border: 1px solid #ff6600;
        padding: 15px;
        background: rgba(255, 102, 0, 0.05);
        margin-top: 15px;
    }

    .node-details h3 {
        color: #ff6600;
        margin-bottom: 10px;
    }

    .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        font-size: 0.9em;
    }

    .details-grid div {
        color: #00ffff;
    }

    strong {
        color: #ff6600;
    }
</style>
