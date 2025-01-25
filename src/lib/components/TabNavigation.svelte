<script lang="ts">
    export let tabs: string[] = [];
    export let activeTab: string;
    export let onTabChange: (tab: string) => void;
</script>

<nav class="tab-navigation">
    {#each tabs as tab}
        <button
            class="tab-button"
            class:active={activeTab === tab}
            on:click={() => onTabChange(tab)}
        >
            {tab}
        </button>
    {/each}
</nav>

<style>
    .tab-navigation {
        display: flex;
        gap: 4px;
        padding: 8px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        margin-bottom: 24px;
    }

    .tab-button {
        padding: 12px 24px;
        border: none;
        background: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        color: #666;
        transition: all 0.2s ease;
    }

    .tab-button:hover {
        background: #f5f5f5;
        color: #333;
    }

    .tab-button.active {
        background: #E8F5E9;
        color: #4CAF50;
        font-weight: 600;
    }
</style> 