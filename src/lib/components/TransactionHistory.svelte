<script lang="ts">
    import { open } from '@tauri-apps/api/shell';
    import type { ITransaction } from '$lib/types';
    import { formatUnixSec, getShorter } from '$lib/utils';

    export let transactions: ITransaction[] = [];
    export let loading = false;

    function openTransactionDetails(txid: string) {
        open(`https://explorer.bitbi.org/tx/${txid}`);
    }
</script>

<div class="sent-transactions">
    <h2>Sent Transactions</h2>
    {#if loading && !transactions.length}
        <p>Loading...</p>
    {:else}
        <table>
            <thead>
                <tr>
                    <th>TxID</th>
                    <th>Comment</th>
                    <th>Date Time</th>
                </tr>
            </thead>
            <tbody>
                {#each transactions as tx, index (tx.txid + index)}
                    <tr>
                        <td>
                            <!-- svelte-ignore a11y-invalid-attribute -->
                            <a href="#" on:click|preventDefault={() => openTransactionDetails(tx.txid)}
                                >{getShorter(tx.txid)}</a
                            >
                        </td>
                        <td>{tx.comment || ''}</td>
                        <td>{formatUnixSec(tx.time)}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>

<style>
    .sent-transactions {
        max-width: 800px;
        margin: 0 auto;
        padding: 30px;
        background-color: #fff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        border-radius: 12px;
    }

    h2 {
        margin: 0 0 20px;
        color: #333;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
    }

    th {
        font-weight: 600;
        color: #666;
    }

    a {
        color: #4CAF50;
        text-decoration: none;
    }

    a:hover {
        text-decoration: underline;
    }
</style> 