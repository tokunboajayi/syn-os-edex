<script lang="ts">
    import { onMount } from "svelte";
    import { writable } from "svelte/store";
    import { getSynosAPI } from "../../modules/synos/init";
    import type { Task } from "../../modules/synos/api-client";

    let tasks: Task[] = [];
    let selectedTask: Task | null = null;
    let metrics = { successRate: 0, avgLatency: 0 };

    onMount(async () => {
        const api = getSynosAPI();
        if (!api) return;

        // Fetch initial tasks
        tasks = await api.getTasks();

        // Subscribe to real-time updates
        api.onTasksUpdate((newTasks) => {
            tasks = newTasks;
            updateMetrics();
        });
    });

    function updateMetrics() {
        const completed = tasks.filter((t) => t.status === "completed").length;
        const total = tasks.length;
        metrics.successRate = total > 0 ? (completed / total) * 100 : 0;
    }

    function selectTask(task: Task) {
        selectedTask = task;
    }

    function getStatusColor(status: string) {
        switch (status) {
            case "running":
                return "#00ff00";
            case "queued":
                return "#ffff00";
            case "failed":
                return "#ff0033";
            case "completed":
                return "#00ffff";
            default:
                return "#666";
        }
    }
</script>

<div class="task-orchestrator">
    <h2>TASK ORCHESTRATOR</h2>

    <div class="metrics-grid">
        <div class="metric-box">
            <span class="label">Active Tasks</span>
            <span class="value"
                >{tasks.filter((t) => t.status === "running").length}</span
            >
        </div>
        <div class="metric-box">
            <span class="label">Queued</span>
            <span class="value"
                >{tasks.filter((t) => t.status === "queued").length}</span
            >
        </div>
        <div class="metric-box">
            <span class="label">Success Rate</span>
            <span class="value">{metrics.successRate.toFixed(1)}%</span>
        </div>
        <div class="metric-box">
            <span class="label">Total</span>
            <span class="value">{tasks.length}</span>
        </div>
    </div>

    <div class="tasks-list">
        {#each tasks as task (task.id)}
            <div
                class="task-item"
                role="button"
                tabindex="0"
                on:click={() => selectTask(task)}
                on:keypress={(e) => e.key === "Enter" && selectTask(task)}
                class:selected={selectedTask?.id === task.id}
                style="border-left-color: {getStatusColor(task.status)}"
            >
                <span class="task-id">{task.id.slice(0, 8)}</span>
                <span class="task-type">{task.type}</span>
                <span
                    class="task-status"
                    style="color: {getStatusColor(task.status)}"
                    >{task.status}</span
                >
                <div class="progress-bar">
                    <div class="progress" style="width: {task.progress}%"></div>
                </div>
            </div>
        {/each}
    </div>

    {#if selectedTask}
        <div class="task-details">
            <h3>TASK: {selectedTask.id}</h3>
            <dl>
                <dt>Type:</dt>
                <dd>{selectedTask.type}</dd>
                <dt>Status:</dt>
                <dd style="color: {getStatusColor(selectedTask.status)}">
                    {selectedTask.status}
                </dd>
                <dt>Priority:</dt>
                <dd>{selectedTask.priority}/10</dd>
                <dt>Progress:</dt>
                <dd>{selectedTask.progress}%</dd>

                {#if selectedTask.predictedDuration}
                    <dt>AI Est. Time:</dt>
                    <dd>{selectedTask.predictedDuration.toFixed(0)} ms</dd>
                {/if}

                {#if selectedTask.assignedNode}
                    <dt>Node:</dt>
                    <dd>{selectedTask.assignedNode}</dd>
                {/if}
            </dl>
        </div>
    {/if}
</div>

<style>
    .task-orchestrator {
        padding: 20px;
        border: 1px solid #00ffff;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        background: rgba(0, 0, 0, 0.8);
    }

    h2 {
        color: #00ffff;
        font-size: 1.2em;
        letter-spacing: 2px;
        margin-bottom: 15px;
        text-transform: uppercase;
        text-shadow: 0 0 10px #00ffff;
    }

    .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 20px;
    }

    .metric-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px;
        border: 1px solid #0099ff;
        background: rgba(0, 153, 255, 0.1);
    }

    .label {
        color: #999;
        font-size: 0.8em;
    }

    .value {
        color: #00ff00;
        font-size: 1.5em;
        font-weight: bold;
        text-shadow: 0 0 10px #00ff00;
    }

    .tasks-list {
        max-height: 400px;
        overflow-y: auto;
        margin-bottom: 20px;
    }

    .task-item {
        display: grid;
        grid-template-columns: 80px 1fr 100px 100px;
        gap: 10px;
        padding: 10px;
        border-left: 3px solid #666;
        margin-bottom: 5px;
        cursor: pointer;
        transition: all 0.2s;
        background: rgba(0, 0, 0, 0.4);
    }

    .task-item:hover {
        background: rgba(0, 255, 255, 0.1);
    }

    .task-item.selected {
        box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
        background: rgba(0, 255, 255, 0.15);
    }

    .task-id {
        color: #00ffff;
        font-family: monospace;
    }

    .task-type {
        color: #999;
    }

    .task-status {
        font-weight: bold;
    }

    .progress-bar {
        height: 4px;
        background: #333;
        position: relative;
        align-self: center;
    }

    .progress {
        height: 100%;
        background: linear-gradient(to right, #00ffff, #00ff00);
        transition: width 0.3s;
    }

    .task-details {
        padding: 15px;
        border: 1px solid #00ff00;
        background: rgba(0, 255, 0, 0.05);
    }

    .task-details h3 {
        color: #00ff00;
        margin-bottom: 10px;
    }

    dl {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 8px;
        font-size: 0.9em;
    }

    dt {
        color: #00ffff;
    }

    dd {
        color: #00ff00;
    }
</style>
