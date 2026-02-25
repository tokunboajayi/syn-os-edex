<script lang="ts">
  import {
    cpuStore,
    memoryStore,
    networkStore,
  } from "../../stores/synos/kernel";

  interface CpuMetric {
    displayValue: string;
    cores: number;
    frequency: number;
  }
  interface MemoryMetric {
    displayValue: string;
    used: number;
    total: number;
  }
  interface NetworkMetric {
    inboundMbps: number;
    outboundMbps: number;
  }

  let cpu: CpuMetric | null = null;
  let memory: MemoryMetric | null = null;
  let network: NetworkMetric | null = null;

  cpuStore.subscribe((value) => (cpu = value));
  memoryStore.subscribe((value) => (memory = value));
  networkStore.subscribe((value) => (network = value));
</script>

<div class="system-metrics">
  <h2>SYSTEM METRICS</h2>

  <div class="metrics-grid">
    {#if cpu}
      <div class="metric-box">
        <h3>CPU</h3>
        <div class="value">{cpu.displayValue}</div>
        <div class="detail">{cpu.cores} cores @ {cpu.frequency} GHz</div>
      </div>
    {/if}

    {#if memory}
      <div class="metric-box">
        <h3>MEMORY</h3>
        <div class="value">{memory.displayValue}</div>
        <div class="detail">
          {memory.used.toFixed(1)} / {memory.total.toFixed(1)} GB
        </div>
      </div>
    {/if}

    {#if network}
      <div class="metric-box">
        <h3>NETWORK</h3>
        <div class="value">
          ⬇ {network.inboundMbps} ⬆ {network.outboundMbps}
        </div>
        <div class="detail">Mbps</div>
      </div>
    {/if}
  </div>
</div>

<style>
  .system-metrics {
    border: 1px solid #00ffff;
    padding: 20px;
    background: rgba(0, 255, 255, 0.05);
    border-radius: 4px;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
  }

  h2 {
    color: #00ffff;
    margin-bottom: 15px;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-shadow: 0 0 10px #00ffff;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
  }

  .metric-box {
    border: 1px solid #00ffff;
    padding: 15px;
    text-align: center;
    background: rgba(0, 0, 0, 0.6);
  }

  .metric-box h3 {
    color: #00ffff;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .value {
    color: #00ff00;
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
    text-shadow: 0 0 10px #00ff00;
  }

  .detail {
    color: #999;
    font-size: 11px;
  }
</style>
