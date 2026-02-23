export const synosConfig = {
    development: {
        apiUrl: 'http://localhost:8000',
        wsUrl: 'ws://localhost:8000',
        apiKey: 'dev-token-12345',
        reconnectDelay: 1000,
        maxReconnectAttempts: 5,
        metricsUpdateInterval: 5000,
    },

    production: {
        apiUrl: 'https://synos.example.com',
        wsUrl: 'wss://synos.example.com',
        apiKey: import.meta.env.VITE_SYNOS_API_KEY || '',
        reconnectDelay: 3000,
        maxReconnectAttempts: 10,
        metricsUpdateInterval: 2000,
    },

    get current() {
        return import.meta.env.DEV ? this.development : this.production
    },
}
