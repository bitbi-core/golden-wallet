<script lang="ts">
	import { open } from '@tauri-apps/api/shell';
	import { curWalletStore, curBcInfo } from '$lib/store';

	import { listRecentTransactions, sendToAddress } from '$lib/wallet-utils';
	import { formatUnixSec, getShorter, sleep } from '$lib/utils';
	import { onMount } from 'svelte';
	import type { ITransaction } from '$lib/types';
	let recipient = '';
	let comment = '';
	let transactionFee = 100;
	let currentBalance = 0.0;
	let amount = 0.0;
	let txLoading = true;
	let isSending = false;
	$: wallet = $curWalletStore;
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
	$: isCaughtUp = !$curBcInfo.initialblockdownload && $curBcInfo.blocks === $curBcInfo.headers;

	let showModal = false;
	let curTxId = '';
	async function sendBitbi() {
		// Form validation
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

		console.log(
			`Sending Bitbi from wallet ${wallet} to ${recipient} with comment ${comment}.
             Transaction fee: ${transactionFee}. `
		);
		if (!wallet) {
			alert('Please select a wallet');
			return;
		}
		isSending = true;
		try {
			curTxId = await sendToAddress(wallet, recipient, amount, comment, transactionFee);
			console.log('Transaction ID:', curTxId);
			sentTransactions = await listRecentTransactions(wallet, 5, 'send');

			// Show the modal with the transaction ID
			showModal = true;
		} catch (e) {
			console.log(`sendBitbi error:`, e);
		} finally {
			isSending = false;
		}
	}

	let sentTransactions: ITransaction[] = [];
	function openTransactionDetails(txid: string) {
		open(`https://explorer.bitbi.org/tx/${txid}`);
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
			<button type="submit">Send Bitbi</button>
			<div class="current-balance">
				<span>Current Balance: </span>
				<span>{currentBalance} BTB</span>
			</div>
		</div>
	</form>
	<div class="sent-transactions">
		<h2>Sent Transactions</h2>
		{#if txLoading && !sentTransactions.length}
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
					{#each sentTransactions as tx, index (tx.txid + index)}
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
	{#if isSending}
		<div class="loading-popup">Sending transaction...</div>
	{/if}
	{#if showModal}
		<div class="modal">
			<div class="modal-content">
				<h2>Transaction successful!</h2>
				<p>
					Transaction ID: <a href="https://explorer.bitbi.org/tx/{curTxId}" target="_blank">{curTxId}</a>
				</p>
				<button on:click={() => (showModal = false)}>Close</button>
			</div>
		</div>
	{/if}
</div>

<style>
	form {
		max-width: 1000px;
		margin: 0 auto;
		padding: 20px;
		background-color: #fff;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
		border-radius: 5px;
	}
	label {
		display: block;
		font-weight: bold;
		margin-bottom: 5px;
	}
	input {
		width: 100%;
		padding: 10px;
		box-sizing: border-box;
		border: 1px solid #ddd;
		border-radius: 5px;
		margin-bottom: 15px;
	}

	button {
		background-color: #007bff;
		color: white;
		border: none;
		padding: 10px 20px;
		margin: 10px 0;
		cursor: pointer;
		border-radius: 5px;
		font-size: 1em;
	}
	button:hover {
		background-color: #0056b3;
	}
	.tx-fee {
		margin-top: 20px;
		background-color: #f8f9fa;
		border-radius: 5px;
	}
	.input-with-unit {
		display: flex;
		align-items: baseline;
	}
	.unit {
		margin-left: 10px;
	}
	.balance-and-submit {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.balance-and-submit button {
		margin: 20px;
	}
	.current-balance {
		font-size: 1.2em;
		font-weight: bold;
	}
	input {
		font-size: 1em;
	}
	.sent-transactions {
		max-width: 1000px;
		margin: 20px auto;
		padding: 20px;
		background-color: #fff;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
		border-radius: 5px;
	}

	.sent-transactions h2 {
		margin-bottom: 20px;
		color: #333;
		font-size: 24px;
	}

	.sent-transactions table {
		width: 100%;
		border-collapse: collapse;
	}

	.sent-transactions th,
	.sent-transactions td {
		padding: 10px;
		border: 1px solid #ddd;
	}

	.sent-transactions th {
		background-color: #f2f2f2;
	}

	.sent-transactions tr:hover {
		background-color: #f5f5f5;
	}

	.sent-transactions a {
		color: #007bff;
		text-decoration: none;
	}

	.sent-transactions a:hover {
		color: #0056b3;
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
		font-size: 2em;
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
	}

	.modal-content {
		background-color: white;
		padding: 20px;
		border-radius: 10px;
	}
</style>
