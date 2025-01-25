<script lang="ts">
	import { curWalletStore, curBcInfo, curWalletInfoStore } from '$lib/store';
	import { listRecentTransactions } from '$lib/wallet-utils';
	import { sleep } from '$lib/utils';
	import { onMount } from 'svelte';
	import type { ITransaction } from '$lib/types';
	import SendTransactionForm from '$lib/components/SendTransactionForm.svelte';
	import TransactionHistory from '$lib/components/TransactionHistory.svelte';
	import TransactionSuccessModal from '$lib/components/TransactionSuccessModal.svelte';

	let txLoading = true;
	let sentTransactions: ITransaction[] = [];
	let showSuccessModal = false;
	let lastTxId = '';

	$: wallet = $curWalletStore;
	$: isCaughtUp = !$curBcInfo.initialblockdownload && $curBcInfo.blocks === $curBcInfo.headers;
	$: currentBalance = $curWalletInfoStore?.balance || 0;
	
	$: {
		if (wallet && isCaughtUp) {
			txLoading = true;
			listRecentTransactions(wallet, 5, 'send').then(txes => {
				sentTransactions = txes;
			}).finally(() => {
				txLoading = false;
			});
		}
	}

	function handleTransactionSent(txId: string) {
		lastTxId = txId;
		showSuccessModal = true;
	}

	onMount(() => {
		let cancel = false;
		async function recentTxLoop() {
			for (; !cancel; await sleep(10000)) {
				if (!isCaughtUp) {
					txLoading = true;
					continue;
				}
				txLoading = true;
				const txes = await listRecentTransactions(wallet, 5, 'send');
				sentTransactions = txes;
				txLoading = false;
			}
		}
		recentTxLoop();
		return () => (cancel = true);
	});
</script>

<div>
	<SendTransactionForm 
		{currentBalance}
		onTransactionSent={handleTransactionSent}
	/>

	<TransactionHistory 
		transactions={sentTransactions}
		loading={txLoading}
	/>

	{#if showSuccessModal}
		<TransactionSuccessModal 
			txId={lastTxId}
			onClose={() => showSuccessModal = false}
		/>
	{/if}
</div>

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

	.unit {
		font-weight: 500;
		color: #666;
		min-width: 60px;
	}

	.balance-and-submit {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 30px;
		padding-top: 20px;
		border-top: 1px solid #f0f0f0;
	}

	.current-balance {
		font-size: 1.1rem;
	}

	.current-balance span:first-child {
		color: #666;
	}

	.current-balance span:last-child {
		font-weight: 600;
		color: #4CAF50;
		margin-left: 8px;
	}

	.sent-transactions {
		max-width: 800px;
		margin: 0 auto;
		padding: 30px;
		background-color: #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		border-radius: 12px;
	}

	.sent-transactions h2 {
		margin: 0 0 25px 0;
		color: #333;
		font-size: 1.5rem;
		padding-bottom: 15px;
		border-bottom: 2px solid #E8F5E9;
	}

	.sent-transactions table {
		width: 100%;
		border-collapse: collapse;
	}

	.sent-transactions th,
	.sent-transactions td {
		padding: 12px;
		text-align: left;
		border-bottom: 1px solid #f0f0f0;
	}

	.sent-transactions th {
		font-weight: 600;
		color: #333;
		background-color: #F5F5F5;
	}

	.sent-transactions tr:hover {
		background-color: #F9F9F9;
	}

	.sent-transactions a {
		color: #4CAF50;
		text-decoration: none;
		font-weight: 500;
	}

	.sent-transactions a:hover {
		text-decoration: underline;
	}

	.loading-popup {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		color: white;
		font-size: 1.5rem;
		z-index: 1000;
	}

	.modal {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal-content {
		background-color: white;
		padding: 30px;
		border-radius: 12px;
		max-width: 500px;
		width: 90%;
		text-align: center;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.modal-content h2 {
		margin: 0 0 20px 0;
		color: #333;
	}

	.modal-content p {
		margin: 0 0 20px 0;
		color: #666;
	}

	.modal-content a {
		color: #4CAF50;
		text-decoration: none;
		font-weight: 500;
	}

	.modal-content a:hover {
		text-decoration: underline;
	}
</style>
