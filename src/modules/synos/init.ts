import { SynosAPIClient } from './api-client'
import { synosConfig } from './config'
import {
    kernelMetricsStore,
    updateMetricsHistory,
    connectedStore,
} from '../../stores/synos/kernel'

let apiClient: SynosAPIClient | null = null
let metricsUnsubscribe: (() => void) | null = null

export async function initSynosBackend(): Promise<void> {
    try {
        console.log('Initializing SYN OS backend...')

        apiClient = new SynosAPIClient(synosConfig.current)

        await apiClient.connect()
        connectedStore.set(true)

        const metrics = await apiClient.getKernelMetrics()
        kernelMetricsStore.set(metrics)
        updateMetricsHistory(metrics)

        metricsUnsubscribe = apiClient.onMetricsUpdate((metrics) => {
            kernelMetricsStore.set(metrics)
            updateMetricsHistory(metrics)
        })

        console.log('✓ SYN OS backend initialized successfully')
    } catch (error) {
        console.error('✗ Failed to initialize SYN OS backend:', error)
        connectedStore.set(false)
    }
}

export function closeSynosBackend(): void {
    if (metricsUnsubscribe) {
        metricsUnsubscribe()
    }
    if (apiClient) {
        apiClient.disconnect()
    }
    connectedStore.set(false)
}

export function getSynosAPI(): SynosAPIClient | null {
    return apiClient
}
