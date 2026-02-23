<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { initSynosBackend, closeSynosBackend } from "./modules/synos/init";
    import { connectedStore } from "./stores/synos/kernel";

    import CommandCenter from "./components/synos/CommandCenter.svelte";

    let connected = false;
    let isElectron = false;

    // Check if running in Electron
    onMount(async () => {
        isElectron = !!(window as any).electronAPI?.isElectron;

        // Initialize backend connection
        await initSynosBackend();

        connectedStore.subscribe((value) => {
            connected = value;
        });
    });

    onDestroy(() => {
        closeSynosBackend();
    });

    // Window controls
    function handleMinimize() {
        (window as any).electronAPI?.minimize();
    }

    function handleMaximize() {
        (window as any).electronAPI?.maximize();
    }

    function handleClose() {
        closeSynosBackend();
        (window as any).electronAPI?.close();
    }
</script>

<main>
    {#if isElectron}
        <div class="title-bar">
            <div class="title">SYN OS - NEURAL OPERATING SYSTEM</div>
            <div class="window-controls">
                <button
                    class="control-btn"
                    on:click={handleMinimize}
                    title="Minimize">−</button
                >
                <button
                    class="control-btn"
                    on:click={handleMaximize}
                    title="Maximize">□</button
                >
                <button
                    class="control-btn close"
                    on:click={handleClose}
                    title="Close">✕</button
                >
            </div>
        </div>
    {/if}

    <!-- Unified Command Center Dashboard -->
    <CommandCenter />
</main>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        background: #0a0e27;
        color: #00ffff;
        font-family: "Courier New", monospace;
        overflow: hidden;
    }

    main {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        padding: 0;
    }

    .title-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        height: 32px;
        background: #000;
        border-bottom: 1px solid #00ffff;
        padding: 0 10px;
        -webkit-app-region: drag;
        user-select: none;
    }

    .title {
        color: #00ffff;
        font-weight: bold;
        font-size: 11px;
        letter-spacing: 2px;
        text-transform: uppercase;
    }

    .window-controls {
        display: flex;
        gap: 0;
        -webkit-app-region: no-drag;
    }

    .control-btn {
        width: 46px;
        height: 32px;
        border: none;
        background: transparent;
        color: #00ffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        font-size: 16px;
    }

    .control-btn:hover {
        background: #1a3a4a;
        color: #00ff00;
    }

    .control-btn.close:hover {
        background: #ff0033;
        color: white;
    }

    /* Unused CSS removed */
</style>
