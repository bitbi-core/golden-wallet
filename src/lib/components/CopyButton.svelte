<script lang="ts">
    export let text: string;
    export let buttonClass = '';
    export let size: 'small' | 'medium' | 'large' = 'medium';
    export let showTooltip = true;

    let copied = false;
    let timeoutId: NodeJS.Timeout;

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(text);
            copied = true;
            
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                copied = false;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }
</script>

<div class="copy-button-wrapper" class:with-tooltip={showTooltip}>
    <button 
        class={`copy-button ${buttonClass} ${copied ? 'copied' : ''} size-${size}`}
        on:click={copyToClipboard}
        aria-label="Copy to clipboard"
    >
        {#if copied}
            <svg viewBox="0 0 24 24" class="icon check-icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
        {:else}
            <svg viewBox="0 0 24 24" class="icon copy-icon">
                <path d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
        {/if}
    </button>
    {#if showTooltip}
        <span class="tooltip">{copied ? 'Copied!' : 'Copy to clipboard'}</span>
    {/if}
</div>

<style>
    .copy-button-wrapper {
        position: relative;
        display: inline-block;
    }

    .copy-button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .copy-button:hover {
        background-color: rgba(0, 0, 0, 0.05);
    }

    .copy-button:active {
        transform: scale(0.95);
    }

    .copy-button.copied {
        color: #4CAF50;
    }

    .icon {
        fill: currentColor;
    }

    .size-small .icon {
        width: 16px;
        height: 16px;
    }

    .size-medium .icon {
        width: 20px;
        height: 20px;
    }

    .size-large .icon {
        width: 24px;
        height: 24px;
    }

    .copy-icon {
        color: #6B7280;
    }

    .check-icon {
        color: #4CAF50;
    }

    .tooltip {
        visibility: hidden;
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        padding: 6px 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        font-size: 12px;
        border-radius: 4px;
        white-space: nowrap;
        margin-bottom: 6px;
        opacity: 0;
        transition: opacity 0.2s ease, visibility 0.2s ease;
    }

    .tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 4px;
        border-style: solid;
        border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
    }

    .with-tooltip .copy-button:hover + .tooltip {
        visibility: visible;
        opacity: 1;
    }

    .with-tooltip .copy-button.copied + .tooltip {
        visibility: visible;
        opacity: 1;
    }
</style> 