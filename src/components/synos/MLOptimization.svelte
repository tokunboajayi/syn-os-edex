<script lang="ts">
    import { onMount } from "svelte";
    import { getSynosAPI } from "../../modules/synos/init";

    interface MLModel {
        id: string;
        name: string;
        accuracy: number;
        lastTrained: string;
        inferenceTime: number;
        status: string;
    }

    let models: MLModel[] = [];
    let selectedModel: MLModel | null = null;

    onMount(async () => {
        const api = getSynosAPI();
        if (!api) return;

        // Mock data for now - you'll replace with actual API calls
        models = [
            {
                id: "ppo-scheduler",
                name: "PPO Scheduler",
                accuracy: 0.87,
                lastTrained: "2 hours ago",
                inferenceTime: 0.8,
                status: "active",
            },
            {
                id: "task-gnn",
                name: "Task GNN",
                accuracy: 0.91,
                lastTrained: "1 day ago",
                inferenceTime: 1.2,
                status: "active",
            },
            {
                id: "anomaly-detector",
                name: "Anomaly Detector",
                accuracy: 0.89,
                lastTrained: "6 hours ago",
                inferenceTime: 0.5,
                status: "active",
            },
        ];
    });

    function selectModel(model: MLModel) {
        selectedModel = model;
    }
</script>

<div class="ml-optimization">
    <h2>ML OPTIMIZATION MODELS</h2>

    <div class="models-grid">
        {#each models as model (model.id)}
            <div
                class="model-card"
                role="button"
                tabindex="0"
                on:click={() => selectModel(model)}
                on:keypress={(e) => e.key === "Enter" && selectModel(model)}
                class:selected={selectedModel?.id === model.id}
            >
                <h3>{model.name}</h3>
                <div class="stat">
                    <span>Accuracy:</span>
                    <span class="value"
                        >{(model.accuracy * 100).toFixed(1)}%</span
                    >
                </div>
                <div class="stat">
                    <span>Last Trained:</span>
                    <span class="value">{model.lastTrained}</span>
                </div>
                <div class="stat">
                    <span>Inference:</span>
                    <span class="value">{model.inferenceTime}ms</span>
                </div>
                <div class="status-badge">{model.status}</div>
            </div>
        {/each}
    </div>

    {#if selectedModel}
        <div class="model-details">
            <h3>{selectedModel.name.toUpperCase()} - ANALYSIS</h3>

            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Accuracy</span>
                    <span class="stat-value"
                        >{(selectedModel.accuracy * 100).toFixed(1)}%</span
                    >
                </div>
                <div class="stat-item">
                    <span class="stat-label">Inference Time</span>
                    <span class="stat-value"
                        >{selectedModel.inferenceTime}ms</span
                    >
                </div>
                <div class="stat-item">
                    <span class="stat-label">Status</span>
                    <span class="stat-value">{selectedModel.status}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Last Trained</span>
                    <span class="stat-value">{selectedModel.lastTrained}</span>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .ml-optimization {
        padding: 20px;
        border: 1px solid #00ff00;
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
        background: rgba(0, 0, 0, 0.8);
    }

    h2 {
        color: #00ff00;
        font-size: 1.2em;
        letter-spacing: 2px;
        margin-bottom: 15px;
        text-transform: uppercase;
        text-shadow: 0 0 10px #00ff00;
    }

    .models-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
    }

    .model-card {
        border: 1px solid #666;
        padding: 15px;
        background: rgba(0, 0, 0, 0.6);
        cursor: pointer;
        transition: all 0.3s;
        position: relative;
    }

    .model-card:hover {
        border-color: #00ff00;
        box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
    }

    .model-card.selected {
        border-color: #00ff00;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
    }

    .model-card h3 {
        color: #00ffff;
        margin-bottom: 10px;
        font-size: 1em;
    }

    .stat {
        display: flex;
        justify-content: space-between;
        font-size: 0.85em;
        margin-bottom: 5px;
        color: #999;
    }

    .value {
        color: #00ff00;
        font-weight: bold;
    }

    .status-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 3px 8px;
        font-size: 0.7em;
        background: #00ff00;
        color: #000;
        font-weight: bold;
        text-transform: uppercase;
    }

    .model-details {
        border: 1px solid #00ff00;
        padding: 20px;
        background: rgba(0, 255, 0, 0.05);
    }

    .model-details h3 {
        color: #00ff00;
        margin-bottom: 15px;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 15px;
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        padding: 10px;
        border: 1px solid #00ff00;
        background: rgba(0, 0, 0, 0.4);
    }

    .stat-label {
        color: #00ffff;
        font-size: 0.8em;
        margin-bottom: 5px;
    }

    .stat-value {
        color: #00ff00;
        font-size: 1.2em;
        font-weight: bold;
        text-shadow: 0 0 10px #00ff00;
    }
</style>
