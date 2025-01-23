<script lang="ts">
	import { open } from '@tauri-apps/api/shell';
	import { curWalletStore } from '$lib/store';
	import type { ITransaction } from '$lib/types';
	import { formatUnixSec, getShorter } from '$lib/utils';
	import { listTransactions } from '$lib/wallet-utils';
	import { onMount } from 'svelte';
	import uniqBy from 'lodash-es/uniqBy';

	let pageTxes: ITransaction[] = [];
	let page = 1;
	let pageSize = 10;
	let totalTransactions = 0;
	let loading = false;
	let copiedTxId: string | null = null;
	let wallet: string;

	$: {
		wallet = $curWalletStore;
		if (wallet) {
			console.log('wallet changed to:', wallet);
			pageSize = 1;
			pageSize = 10;
			fetchPagedTx();
		}
	}

	async function fetchPagedTx() {
		loading = true;
		try {
			const tx = await listTransactions(wallet, '*', pageSize * 2, (page - 1) * pageSize);
			const uniqueTx = uniqBy(tx, 'txid');
			pageTxes = uniqueTx.sort((a: ITransaction, b: ITransaction) => b.time - a.time).slice(0, pageSize);
			totalTransactions = tx.length; // This is an approximation
		} catch (e) {
			console.error('fetchPagedTx e:', e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchPagedTx();
	});

	const changePage = async (newPage: number) => {
		page = newPage;
		await fetchPagedTx();
	};

	function openTransactionDetails(txid: string) {
		open(`https://explorer.bitbi.org/tx/${txid}`);
	}

	function copyTxId(txid: string) {
		navigator.clipboard.writeText(txid);
		copiedTxId = txid;
		setTimeout(() => {
			if (copiedTxId === txid) {
				copiedTxId = null;
			}
		}, 2000);
	}

	function getAmountClass(amount: number) {
		return amount > 0 ? 'positive' : amount < 0 ? 'negative' : '';
	}

	function formatAmount(amount: number) {
		return `${amount > 0 ? '+' : ''}${amount.toFixed(8)}`;
	}
</script>

<div class="transactions-container">
	<div class="header">
		<h2>Transaction History</h2>
	</div>

	<div class="table-container">
		{#if loading}
			<div class="loading">Loading transactions...</div>
		{:else if pageTxes.length === 0}
			<div class="no-transactions">No transactions found</div>
		{:else}
			<table>
				<thead>
					<tr>
						<th>Time</th>
						<th>Amount</th>
						<th>Category</th>
						<th>Transaction ID</th>
						<th>Comment</th>
					</tr>
				</thead>
				<tbody>
					{#each pageTxes as transaction (transaction.txid)}
						<tr>
							<td class="time-cell">
								{formatUnixSec(transaction.time)}
							</td>
							<td class="amount-cell {getAmountClass(transaction.amount)}">
								{formatAmount(transaction.amount)} BTB
							</td>
							<td class="category-cell">
								<span class="category-tag">
									{transaction.category}
								</span>
							</td>
							<td class="txid-cell">
								<div class="txid-container">
									<a 
										href="#" 
										on:click|preventDefault={() => openTransactionDetails(transaction.txid)}
										title="View transaction details"
									>
										{getShorter(transaction.txid)}
									</a>
									<button 
										class="copy-button" 
										class:copied={copiedTxId === transaction.txid}
										on:click={() => copyTxId(transaction.txid)}
										title="Copy transaction ID"
									>
										{copiedTxId === transaction.txid ? 'Copied!' : 'Copy'}
									</button>
								</div>
							</td>
							<td class="comment-cell">
								{transaction.comment || '—'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<div class="pagination">
				<div class="pagination-controls">
					<button 
						class="page-button"
						on:click={() => changePage(1)}
						disabled={page === 1 || loading}
						title="First page"
					>
						«
					</button>
					<button 
						class="page-button" 
						on:click={() => changePage(page - 1)} 
						disabled={page === 1 || loading}
					>
						‹ Previous
					</button>
					<div class="page-info">
						<span>Page {page}</span>
						{#if totalTransactions > 0}
							<span class="page-count">of {Math.ceil(totalTransactions / pageSize)}</span>
						{/if}
					</div>
					<button 
						class="page-button" 
						on:click={() => changePage(page + 1)}
						disabled={totalTransactions <= page * pageSize || loading}
					>
						Next ›
					</button>
					<button 
						class="page-button"
						on:click={() => changePage(Math.ceil(totalTransactions / pageSize))}
						disabled={totalTransactions <= page * pageSize || loading}
						title="Last page"
					>
						»
					</button>
				</div>
				{#if totalTransactions > 0}
					<div class="page-summary">
						Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalTransactions)} of {totalTransactions} transactions
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.transactions-container {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		background: white;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.header {
		padding: 24px;
		border-bottom: 1px solid #f0f0f0;
	}

	h2 {
		margin: 0;
		color: #333;
		font-size: 1.5rem;
	}

	.table-container {
		padding: 24px;
	}

	.loading, .no-transactions {
		text-align: center;
		padding: 40px;
		color: #666;
		font-size: 1.1rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 24px;
	}

	th, td {
		padding: 16px;
		text-align: left;
		border-bottom: 1px solid #f0f0f0;
	}

	th {
		font-weight: 600;
		color: #666;
		background: #f9f9f9;
		white-space: nowrap;
	}

	tr:hover {
		background: #f9f9f9;
	}

	.time-cell {
		white-space: nowrap;
		color: #666;
	}

	.amount-cell {
		font-family: monospace;
		font-weight: 600;
		white-space: nowrap;
	}

	.amount-cell.positive {
		color: #4CAF50;
	}

	.amount-cell.negative {
		color: #f44336;
	}

	.category-cell {
		width: 120px;
	}

	.category-tag {
		display: inline-block;
		padding: 4px 8px;
		background: #E8F5E9;
		color: #4CAF50;
		border-radius: 4px;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.txid-cell {
		width: 250px;
	}

	.txid-container {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.txid-container a {
		color: #4CAF50;
		text-decoration: none;
		font-family: monospace;
		font-weight: 500;
	}

	.txid-container a:hover {
		text-decoration: underline;
	}

	.copy-button {
		padding: 4px 8px;
		background: #E8F5E9;
		color: #4CAF50;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.85rem;
		font-weight: 500;
	}

	.copy-button:hover {
		background: #C8E6C9;
	}

	.copy-button.copied {
		background: #4CAF50;
		color: white;
	}

	.comment-cell {
		color: #666;
		font-style: italic;
	}

	.pagination {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		margin-top: 24px;
		padding-top: 24px;
		border-top: 1px solid #f0f0f0;
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.page-button {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 16px;
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		color: #666;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 40px;
		justify-content: center;
	}

	.page-button:hover:not(:disabled) {
		background: #f5f5f5;
		border-color: #4CAF50;
		color: #4CAF50;
	}

	.page-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: #f9f9f9;
	}

	.page-info {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		background: #f5f5f5;
		border-radius: 6px;
		color: #666;
		font-size: 0.95rem;
		min-width: 120px;
		justify-content: center;
	}

	.page-count {
		color: #999;
	}

	.page-summary {
		color: #666;
		font-size: 0.9rem;
	}

	.page-button span {
		font-size: 1.2rem;
		line-height: 1;
	}
</style>
