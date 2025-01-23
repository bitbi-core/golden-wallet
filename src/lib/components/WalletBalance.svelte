<script lang="ts">
    export let availableBalance = 0.0;
    export let pendingBalance = 0.0;
    export let immatureBalance = 0.0;
    
    $: totalBalance = availableBalance + pendingBalance + immatureBalance;
</script>

<div class="balances">
    <div>
        <h2>Balances</h2>
    </div>
    <div class="balance-item">
        <span>Available:</span> <span>{availableBalance.toFixed(4)} BTB</span>
    </div>
    <div class="balance-item">
        <span>Pending:</span> <span>{pendingBalance.toFixed(4)} BTB</span>
    </div>
    <div class="balance-item">
        <span>Immature:</span> <span>{immatureBalance.toFixed(4)} BTB</span>
    </div>
    <hr />
    <div class="balance-item">
        <span>Total:</span> <span>{totalBalance.toFixed(4)} BTB</span>
    </div>
</div>

<style>
    .balances {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        padding: 25px;
    }

    .balances h2 {
        display: flex;
        align-items: center;
        font-size: 1.75rem;
        margin: 0 0 25px 0;
        color: #333;
        padding-bottom: 15px;
        border-bottom: 2px solid #E8F5E9;
    }

    .balance-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border-bottom: 1px solid #f0f0f0;
        font-size: 1.1rem;
    }

    .balance-item:last-child {
        border-bottom: none;
        margin-top: 10px;
        padding-top: 20px;
        border-top: 2px solid #E8F5E9;
    }

    .balance-item span:first-child {
        color: #666;
        font-weight: 500;
    }

    .balance-item span:last-child {
        font-weight: 600;
        color: #333;
    }

    .balance-item:last-child span {
        font-size: 1.2rem;
        font-weight: 600;
    }

    .balance-item:last-child span:last-child {
        color: #4CAF50;
    }

    hr {
        border: none;
        border-top: 1px solid #f0f0f0;
        margin: 15px 0;
    }
</style> 