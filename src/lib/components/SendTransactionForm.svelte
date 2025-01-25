<script lang="ts">
    import { curWalletStore } from '$lib/store';
    import { sendToAddress } from '$lib/wallet-utils';
    
    export let currentBalance = 0.0;
    export let onTransactionSent: (txId: string) => void;

    let recipient = '';
    let comment = '';
    let transactionFee = 100;
    let amount = 0.0;
    let isSending = false;
    $: wallet = $curWalletStore;

    async function sendBitbi() {
        if (!recipient) {
            alert('Please enter a recipient address');
            return;
        }
        if (!transactionFee || transactionFee <= 0) {
            alert('Please enter a valid transaction fee');
            return;
        }
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        if (!wallet) {
            alert('Please select a wallet');
            return;
        }
        
        isSending = true;
        try {
            const txId = await sendToAddress(wallet, recipient, amount, comment, transactionFee);
            onTransactionSent(txId);
            // Reset form
            recipient = '';
            amount = 0;
            comment = '';
        } catch (e) {
            console.log(`sendBitbi error:`, e);
        } finally {
            isSending = false;
        }
    }
</script>

<form on:submit|preventDefault={sendBitbi}>
    <div>
        <label for="recipient">Recipient:</label>
        <input id="recipient" bind:value={recipient} placeholder="Enter recipient's address " />
    </div>
    <div>
        <label for="amount">Amount:</label>
        <div class="input-with-unit">
            <input
                type="number"
                id="amount"
                step="0.00001"
                bind:value={amount}
                placeholder="Enter the amount to send"
            />
            <span class="unit">BTB</span>
        </div>
    </div>
    <div>
        <label for="comment">Comment:</label>
        <input id="comment" bind:value={comment} placeholder="Add a comment" />
    </div>

    <div class="tx-fee">
        <label for="transactionFee"> Fee Rate:</label>
        <div class="input-with-unit">
            <input
                type="number"
                id="transactionFee"
                bind:value={transactionFee}
                placeholder="Enter custom transaction fee rate in sat/vB"
            />
            <span class="unit">sat/vB</span>
        </div>
    </div>
    <div class="balance-and-submit">
        <button type="submit" disabled={isSending}>Send Bitbi</button>
        <div class="current-balance">
            <span>Current Balance: </span>
            <span>{currentBalance} BTB</span>
        </div>
    </div>
</form>

{#if isSending}
    <div class="loading-popup">Sending transaction...</div>
{/if}

<style>
    form {
        max-width: 800px;
        margin: 0 auto 30px;
        padding: 30px;
        background-color: #fff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-radius: 12px;
    }

    label {
        display: block;
        font-weight: 600;
        margin-bottom: 8px;
        color: #333;
    }

    input {
        width: 100%;
        padding: 12px;
        box-sizing: border-box;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        font-size: 1rem;
        transition: all 0.2s ease;
        margin-bottom: 20px;
    }

    input:focus {
        border-color: #4CAF50;
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
        outline: none;
    }

    button {
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 12px 24px;
        cursor: pointer;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 600;
        transition: background-color 0.2s ease;
    }

    button:hover:not(:disabled) {
        background-color: #43A047;
    }

    button:disabled {
        background-color: #e0e0e0;
        cursor: not-allowed;
    }

    .tx-fee {
        margin-top: 25px;
        padding: 20px;
        background-color: #F5F5F5;
        border-radius: 8px;
    }

    .input-with-unit {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .loading-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 8px;
        z-index: 1000;
    }
</style> 