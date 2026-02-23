# SYN OS Frontend Integration Guide

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:5173
```

## Configuration

The frontend connects to the Syn OS backend via WebSocket and REST API.

### Environment Variables

Edit `.env.local`:
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_SYNOS_API_KEY=dev-token-12345
```

## Project Structure

```
syn-os-edex/
├── src/
│   ├── components/synos/     # Syn OS components
│   ├── stores/synos/          # State management
│   ├── modules/synos/         # API integration
│   └── api/synos/             # API endpoints
├── .env.local                 # Configuration
└── synos.config.json          # Feature flags
```

## Key Components

- **SystemMetrics.svelte**: Real-time CPU, memory, network display
- **TaskOrchestrator.svelte**: Task queue management
- **MLOptimization.svelte**: ML model monitoring
- **ClusterStatus.svelte**: Node topology visualization

## Backend Integration

The frontend uses:
1. **REST API**: Task submission, metrics fetching
2. **WebSocket**: Real-time updates for metrics and tasks

## Next Steps

1. Install dependencies: `npm install`
2. Start backend: `cd ../syn-os && docker-compose up -d`
3. Start frontend: `npm run dev`
4. Open browser: `http://localhost:5173`
