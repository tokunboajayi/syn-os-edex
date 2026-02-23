import { writable, derived } from 'svelte/store'
import type { KernelMetrics } from '../../modules/synos/api-client'

// Raw kernel metrics store
export const kernelMetricsStore = writable<KernelMetrics | null>(null)

// CPU metrics store
export const cpuStore = derived(kernelMetricsStore, ($metrics) => {
    if (!$metrics) return null
    return {
        cores: $metrics.cpu.cores,
        utilization: $metrics.cpu.utilization,
        frequency: $metrics.cpu.frequency,
        displayValue: `${$metrics.cpu.utilization.toFixed(1)}%`,
        timestamp: $metrics.timestamp,
    }
})

// Memory metrics store
export const memoryStore = derived(kernelMetricsStore, ($metrics) => {
    if (!$metrics) return null
    const usedGb = ($metrics.memory.total - $metrics.memory.available) / (1024 ** 3)
    const totalGb = $metrics.memory.total / (1024 ** 3)

    return {
        utilization: $metrics.memory.utilization,
        used: usedGb,
        total: totalGb,
        displayValue: `${$metrics.memory.utilization.toFixed(1)}%`,
        timestamp: $metrics.timestamp,
    }
})

// Network metrics store
export const networkStore = derived(kernelMetricsStore, ($metrics) => {
    if (!$metrics) return null
    return {
        inbound: $metrics.network.inbound,
        outbound: $metrics.network.outbound,
        inboundMbps: ($metrics.network.inbound / 1024 / 1024).toFixed(2),
        outboundMbps: ($metrics.network.outbound / 1024 / 1024).toFixed(2),
        timestamp: $metrics.timestamp,
    }
})

// Connected status
export const connectedStore = writable(false)

// Metrics history for graphs
export const metricsHistoryStore = writable<{
    cpu: number[]
    memory: number[]
    network: { inbound: number[]; outbound: number[] }
}>({
    cpu: [],
    memory: [],
    network: { inbound: [], outbound: [] },
})

export function updateMetricsHistory(metrics: KernelMetrics) {
    metricsHistoryStore.update((history) => {
        return {
            cpu: [...history.cpu, metrics.cpu.utilization].slice(-60),
            memory: [...history.memory, metrics.memory.utilization].slice(-60),
            network: {
                inbound: [...history.network.inbound, metrics.network.inbound].slice(-60),
                outbound: [...history.network.outbound, metrics.network.outbound].slice(-60),
            },
        }
    })
}
