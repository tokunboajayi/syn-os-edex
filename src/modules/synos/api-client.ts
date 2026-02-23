import type { Socket } from 'socket.io-client'
import io from 'socket.io-client'

export interface SynosConfig {
    apiUrl: string
    wsUrl: string
    apiKey: string
    reconnectDelay: number
    maxReconnectAttempts: number
}

export interface KernelMetrics {
    cpu: {
        utilization: number
        cores: number
        frequency: number
    }
    memory: {
        utilization: number
        total: number
        available: number
    }
    io: {
        readSpeed: number
        writeSpeed: number
    }
    network: {
        inbound: number
        outbound: number
    }
    timestamp: number
}

export interface Task {
    id: string
    status: 'queued' | 'scheduled' | 'running' | 'completed' | 'failed'
    type: string
    priority: number
    submittedAt: number
    startedAt?: number
    completedAt?: number
    progress: number
    predictedDuration?: number
    assignedNode?: string
}

export class SynosAPIClient {
    private socket: Socket | null = null
    private apiUrl: string
    private apiKey: string
    private config: SynosConfig

    constructor(config: SynosConfig) {
        this.config = config
        this.apiUrl = config.apiUrl
        this.apiKey = config.apiKey
    }

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io(this.config.wsUrl, {
                    auth: { token: this.apiKey },
                    reconnection: true,
                    reconnectionDelay: this.config.reconnectDelay,
                    reconnectionAttempts: this.config.maxReconnectAttempts,
                })

                this.socket.on('connect', () => {
                    console.log('✓ Connected to SYN OS backend')
                    resolve()
                })

                this.socket.on('error', (error) => {
                    console.error('✗ Connection error:', error)
                    reject(error)
                })
            } catch (error) {
                reject(error)
            }
        })
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect()
            this.socket = null
        }
    }

    async getKernelMetrics(): Promise<KernelMetrics> {
        const response = await fetch(`${this.apiUrl}/api/v1/system/metrics`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
        })
        return response.json()
    }

    async getTasks(filter?: string): Promise<Task[]> {
        const url = filter
            ? `${this.apiUrl}/api/v1/tasks?status=${filter}`
            : `${this.apiUrl}/api/v1/tasks`

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    onMetricsUpdate(callback: (metrics: KernelMetrics) => void): () => void {
        if (!this.socket) throw new Error('Not connected')

        this.socket.on('metrics:update', callback)
        return () => {
            this.socket?.off('metrics:update', callback)
        }
    }

    onTasksUpdate(callback: (tasks: Task[]) => void): () => void {
        if (!this.socket) throw new Error('Not connected')

        this.socket.on('tasks:update', callback)
        return () => {
            this.socket?.off('tasks:update', callback)
        }
    }

    // Security API Methods
    async getSecurityScore(): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/security/score`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    async getSecurityAlerts(limit: number = 100): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/security/alerts?limit=${limit}`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    async getUnresolvedAlerts(): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/security/alerts/unresolved`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    async resolveSecurityAlert(alertId: string): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/security/alerts/${alertId}/resolve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    async getSecurityStats(): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/security/stats`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    async getRealtimeThreats(): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/security/threats/realtime`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    async triggerSecurityScan(): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/security/scan`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    async startSecurityCollection(): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/security/collection/start`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    // Network Scanner
    async startNetworkScan(target: string, ports: number[] = [80, 443, 22, 21, 23, 3389]): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/scanner/scan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ target, ports, timeout_ms: 2000 })
        })
        return response.json()
    }

    async getScans(): Promise<any[]> {
        const response = await fetch(`${this.apiUrl}/api/v1/scanner/scans`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    async getScanDetails(scanId: string): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/scanner/scans/${scanId}`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    // Geospatial
    async ingestLocation(point: any): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/geo/location`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(point)
        })
        return response.json()
    }

    async getFloorPlans(): Promise<any[]> {
        const response = await fetch(`${this.apiUrl}/api/v1/geo/floorplans`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    async createFloorPlan(plan: {
        name: string
        building: string
        floor: number
        image_url: string
        bounds: [[number, number], [number, number]]
    }): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/geo/floorplan`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(plan),
        })
        if (!response.ok) throw new Error(await response.text())
        return response.json()
    }

    async predictPath(deviceId: string): Promise<any> {
        const response = await fetch(`${this.apiUrl}/api/v1/geo/predict/${deviceId}`, {
            headers: { 'Authorization': `Bearer ${this.apiKey}` },
        })
        return response.json()
    }

    // WebSocket Events
    onSecurityScanComplete(callback: (scan: any) => void): () => void {
        if (!this.socket) throw new Error('Not connected')
        this.socket.on('security:scan_complete', callback)
        return () => {
            this.socket?.off('security:scan_complete', callback)
        }
    }

    onGeoLocationUpdate(callback: (location: any) => void): () => void {
        if (!this.socket) throw new Error('Not connected')
        this.socket.on('geo:location_update', callback)
        return () => {
            this.socket?.off('geo:location_update', callback)
        }
    }
}
