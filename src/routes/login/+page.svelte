<script lang="ts">
    import { walletStore } from '$lib/stores/wallet-store';
    import { goto } from '$app/navigation';
    import LoadingOverlay from '$lib/components/LoadingOverlay.svelte';
    
    let password = '';
    let isLoading = false;

    $: showRestoreOption = $walletStore.failedAttempts >= 3;
    $: serverError = $walletStore.serverError;
    $: error = $walletStore.error;

    $: console.log("login serverError: ", serverError);

    async function handleSubmit() {
        isLoading = true;

        try {
            const success = await walletStore.unlockWallet(password);
            console.log("Login success:", success);
            if (success) {
                // Clear any error states
                error = null;
                serverError = undefined;
                // Navigate to wallet page
                goto('/wallet');
            }
        } catch (e) {
            console.error('Unlock error:', e);
        } finally {
            isLoading = false;
        }
    }

    function goToRestore() {
        goto('/restore');
    }
</script>

{#if isLoading || $walletStore.isScanning}
    <div class="overlay">
        <div class="overlay-content">
            <h2>{$walletStore.serverError?.message || 'Unlocking wallet...'}</h2>
            {#if $walletStore.serverError?.tips}
                <div class="progress-info">
                    {#each $walletStore.serverError.tips as tip}
                        <p>{tip}</p>
                    {/each}
                </div>
            {/if}
            <div class="spinner"></div>
        </div>
    </div>
{/if}

<div class="container">
    <h1>Unlock Wallet</h1>
    <p>Enter your password to unlock your wallet.</p>

    <form on:submit|preventDefault={handleSubmit}>
        <div class="field">
            <label for="password">Password</label>
            <input
                type="password"
                id="password"
                bind:value={password}
                placeholder="Enter your password"
                required
            />
        </div>

        {#if error || serverError}
            <div class="error">
                {#if error}
                    <p class="error-message">{error}</p>
                {/if}
                {#if serverError}
                    <div class="error-tips">
                        <p class="error-title">{serverError.message}</p>
                        <ul>
                            {#each serverError.tips as tip}
                                <li>{tip}</li>
                            {/each}
                        </ul>
                    </div>
                {/if}
            </div>
        {/if}

        <button type="submit" disabled={isLoading || $walletStore.isScanning}>
            {isLoading || $walletStore.isScanning ? 'Processing...' : 'Unlock Wallet'}
        </button>

        {#if showRestoreOption}
            <div class="restore-section">
                <p>Too many failed attempts?</p>
                <button type="button" class="secondary" on:click={goToRestore}>
                    Restore Using Recovery Phrase
                </button>
            </div>
        {/if}
    </form>
</div>

<style>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .overlay-content {
        background-color: white;
        padding: 2rem;
        border-radius: 8px;
        text-align: center;
        max-width: 80%;
        width: 500px;
    }

    .overlay-content h2 {
        margin: 0 0 1rem 0;
        color: #333;
    }

    .progress-info {
        margin: 1rem 0;
        text-align: left;
    }

    .progress-info p {
        margin: 0.5rem 0;
        color: #666;
        font-size: 0.9rem;
    }

    .spinner {
        margin: 1rem auto;
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #4CAF50;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .container {
        max-width: 480px;
        margin: 40px auto;
        padding: 2.5rem;
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        box-sizing: border-box;
    }

    h1 {
        margin: 0 0 1rem 0;
        font-size: 2.25rem;
        color: #333;
        text-align: center;
    }

    p {
        margin: 0 0 2rem 0;
        color: #666;
        text-align: center;
        font-size: 1.1rem;
        line-height: 1.5;
    }

    .field {
        margin-bottom: 1.5rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        color: #333;
        font-weight: 500;
    }

    input {
        width: 100%;
        padding: 0.75rem;
        margin: 0;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.2s;
    }

    input:focus {
        border-color: #4CAF50;
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
    }

    .error {
        color: #d32f2f;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background-color: #ffebee;
        border-radius: 4px;
        border: 1px solid #ffcdd2;
        box-sizing: border-box;
    }

    button {
        width: 100%;
        padding: 0.875rem;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 500;
        margin-bottom: 1rem;
        transition: background-color 0.2s;
        box-sizing: border-box;
    }

    button:hover:not(:disabled) {
        background-color: #43a047;
    }

    button:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    .restore-section {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #eee;
        text-align: center;
    }

    .restore-section p {
        color: #666;
        margin-bottom: 1rem;
    }

    button.secondary {
        background-color: #2196F3;
    }

    button.secondary:hover:not(:disabled) {
        background-color: #1976D2;
    }

    .error-message {
        margin: 0 0 0.5rem 0;
        font-weight: 500;
    }

    .error-tips {
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid #ffcdd2;
    }

    .error-title {
        font-weight: 600;
        margin: 0 0 0.5rem 0;
    }

    .error-tips ul {
        margin: 0;
        padding-left: 1.5rem;
        list-style-type: disc;
    }

    .error-tips li {
        margin: 0.25rem 0;
        color: #666;
        font-size: 0.9rem;
    }

    :global(body) {
        margin: 0;
        padding: 0;
        background-color: #f5f5f5;
        min-height: 100vh;
    }
</style>