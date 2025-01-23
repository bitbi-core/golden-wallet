<script lang="ts">
	import { open } from '@tauri-apps/api/shell';
	import type { IWrapTransaction, IUnwrapTransaction } from '$lib/types';
	import ClosableModal from '$lib/components/ClosableModel.svelte';

	export let direction: 'btb_to_ebtb' | 'ebtb_to_btb';
	export let wrapHistory: IWrapTransaction[];
	export let unwrapHistory: IUnwrapTransaction[];
	export let showDetailsModal: boolean;
	export let selectedTransaction: IWrapTransaction | IUnwrapTransaction | null;

	function getStatusStyle(status: string): string {
		// Completed statuses
		if (status === 'WRAP_COMPLETED' || status === 'UNWRAP_COMPLETED') {
			return 'status-completed';
		}
		
		// Progress statuses for wrap
		if (['WRAP_BTB_TRANSACTION_BROADCASTED', 'WRAP_BTB_TRANSACTION_CONFIRMING', 'EBTB_MINTING_IN_PROGRESS'].includes(status)) {
			return 'status-progress';
		}
		
		// Progress statuses for unwrap
		if (['UNWRAP_ETH_TRANSACTION_INITIATED', 'UNWRAP_ETH_TRANSACTION_CONFIRMING', 
			'UNWRAP_ETH_TRANSACTION_CONFIRMED', 'EBTB_BURN_CONFIRMED',
			'UNWRAP_BTB_TRANSACTION_CREATING', 'UNWRAP_BTB_TRANSACTION_BROADCASTED'].includes(status)) {
			return 'status-progress';
		}
		
		// Error statuses
		if (['FAILED_INSUFFICIENT_AMOUNT', 'FAILED_TRANSACTION_NOT_FOUND', 
			'FAILED_INSUFFICIENT_FUNDS', 'FAILED_TRANSACTION_UNKNOWN',
			'FAILED_TRANSACTION_MAX_ATTEMPTS'].includes(status)) {
			return 'status-error';
		}
		
		return '';
	}

	function getFriendlyStatus(status: string): string {
		const style = getStatusStyle(status);
		switch(style) {
			case 'status-completed':
				return 'Completed';
			case 'status-progress':
				return 'Progressing';
			case 'status-error':
				return 'Error';
			default:
				return status;
		}
	}

	function openDetailsModal(transaction: IWrapTransaction | IUnwrapTransaction) {
		selectedTransaction = transaction;
		showDetailsModal = true;
	}

	function closeDetailsModal() {
		showDetailsModal = false;
		selectedTransaction = null;
	}

	function isWrapTransaction(transaction: IWrapTransaction | IUnwrapTransaction): transaction is IWrapTransaction {
		return 'receiving_address' in transaction;
	}
</script>

<div class="card mt-6">
	<h2>{direction === 'btb_to_ebtb' ? 'Wrap (BTB to eBTB)' : 'Unwrap (eBTB to BTB)'} History</h2>
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Amount</th>
				<th>Status</th>
				<th>Details</th>
			</tr>
		</thead>
		<tbody>
			{#each (direction === 'btb_to_ebtb' ? wrapHistory : unwrapHistory) as transaction}
				<tr>
					<td>{new Date(transaction.create_time).toLocaleString()}</td>
					<td>{transaction.amount} {direction === 'btb_to_ebtb' ? 'BTB' : 'eBTB'}</td>
					<td class={getStatusStyle(transaction.status)}>{getFriendlyStatus(transaction.status)}</td>
					<td>
						<button class="view-details-button" on:click={() => openDetailsModal(transaction)}>
							View Details
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if showDetailsModal && selectedTransaction}
	<div 
		class="modal-overlay" 
		on:keydown={(e) => e.key === 'Escape' && closeDetailsModal()}
		tabindex="-2"
		role="button"
		aria-label="Close details modal"
	>
		<div class="details-modal" 
			tabindex="-1"
			role="button"
			on:keydown={(e) => e.key === 'Escape' && closeDetailsModal()}
		>
			<div class="details-modal-header">
				<h3>Transaction Details</h3>
				<button class="close-button" on:click={closeDetailsModal}>&times;</button>
			</div>
			<div class="details-modal-content">
				{#if isWrapTransaction(selectedTransaction)}
					<div class="detail-item">
						<span class="detail-label">BTB Transaction ID:</span>
						<span class="detail-value">
							<a  target="_blank" rel="noopener noreferrer" href="https://explorer.bitbi.org/tx/{selectedTransaction.btb_tx_id}">
								{selectedTransaction.btb_tx_id}
							</a>
						</span>
					</div>
					{#if selectedTransaction.eth_tx_hash}
						<div class="detail-item">
							<span class="detail-label">ETH Transaction Hash:</span>
							<span class="detail-value">
								<a  target="_blank" rel="noopener noreferrer" href="https://etherscan.io/tx/{selectedTransaction.eth_tx_hash}">
									{selectedTransaction.eth_tx_hash}
								</a>
							</span>
						</div>
					{/if}
					<div class="detail-item">
						<span class="detail-label">Receiving Address:</span>
						<span class="detail-value">
							<a  target="_blank" rel="noopener noreferrer" href="https://etherscan.io/address/{selectedTransaction.receiving_address}">
								{selectedTransaction.receiving_address}
							</a>
						</span>
					</div>
					{#if selectedTransaction.minted_ebtb_amount !== null}
						<div class="detail-item">
							<span class="detail-label">Minted eBTB:</span>
							<span class="detail-value">{selectedTransaction.minted_ebtb_amount}</span>
						</div>
					{/if}
				{:else}
					<div class="detail-item">
						<span class="detail-label">ETH Transaction Hash:</span>
						<span class="detail-value">
							<a  target="_blank" rel="noopener noreferrer" href="https://etherscan.io/tx/{selectedTransaction.eth_tx_hash}">
								{selectedTransaction.eth_tx_hash}
							</a>
						</span>
					</div>
					{#if selectedTransaction.btb_tx_id}
						<div class="detail-item">
							<span class="detail-label">BTB Transaction ID:</span>
							<span class="detail-value">
								<a  target="_blank" rel="noopener noreferrer" href="https://explorer.bitbi.org/tx/{selectedTransaction.btb_tx_id}">
									{selectedTransaction.btb_tx_id}
								</a>
							</span>
						</div>
					{/if}
					<div class="detail-item">
						<span class="detail-label">Receiving Address:</span>
						<span class="detail-value">
							<a  target="_blank" rel="noopener noreferrer" href="https://explorer.bitbi.org/address/{selectedTransaction.btb_receiving_address}">
								{selectedTransaction.btb_receiving_address}
							</a>
						</span>
					</div>
				{/if}
				{#if selectedTransaction.exception_count > 0}
					<div class="detail-item error">
						<span class="detail-label">Exceptions:</span>
						<span class="detail-value">{selectedTransaction.exception_count}</span>
					</div>
					<div class="detail-item error">
						<span class="detail-label">Last Exception:</span>
						<span class="detail-value">
							{selectedTransaction.last_exception_time ? new Date(selectedTransaction.last_exception_time).toLocaleString() : 'N/A'}
						</span>
					</div>
					<div class="detail-item error">
						<span class="detail-label">Exception Details:</span>
						<span class="detail-value">{selectedTransaction.exception_details}</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.card {
		background: white;
		border-radius: 12px;
		padding: 32px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		width: 100%;
	}

	.mt-6 {
		margin-top: 24px;
	}

	h2 {
		margin: 0 0 24px 0;
		color: #333;
		font-size: 1.5rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 16px;
	}

	th, td {
		border: 1px solid #ddd;
		padding: 12px;
		text-align: left;
	}

	th {
		background-color: #f8f9fa;
		font-weight: 600;
	}

	tr:hover {
		background-color: #f8f9fa;
	}

	.status-completed {
		color: #52c41a;
		font-weight: 500;
		background: #f6ffed;
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid #b7eb8f;
	}

	.status-progress {
		color: #1890ff;
		font-weight: 500;
		background: #e6f7ff;
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid #91d5ff;
	}

	.status-error {
		color: #f5222d;
		font-weight: 500;
		background: #fff1f0;
		padding: 4px 8px;
		border-radius: 4px;
		border: 1px solid #ffa39e;
	}

	.view-details-button {
		background: none;
		border: none;
		color: #4a90e2;
		cursor: pointer;
		padding: 4px 8px;
		font-size: 14px;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.view-details-button:hover {
		background: #f0f7ff;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 999;
	}

	.details-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		padding: 24px;
		border-radius: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		max-width: 600px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.details-modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16px;
		padding-bottom: 16px;
		border-bottom: 1px solid #eee;
	}

	.details-modal-header h3 {
		margin: 0;
		font-size: 18px;
		color: #333;
	}

	.close-button {
		background: none;
		border: none;
		font-size: 24px;
		color: #666;
		cursor: pointer;
		padding: 4px;
		line-height: 1;
	}

	.close-button:hover {
		color: #333;
	}

	.details-modal-content {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 8px;
		background: #f8f9fa;
		border-radius: 8px;
	}

	.detail-item.error {
		background: #fff2f0;
	}

	.detail-label {
		font-size: 12px;
		color: #666;
		font-weight: 500;
	}

	.detail-value {
		font-family: monospace;
		font-size: 13px;
		word-break: break-all;
		color: #333;
	}

	.detail-item.error .detail-label {
		color: #ff4d4f;
	}

	.detail-item.error .detail-value {
		color: #cf1322;
	}

	.detail-value a {
		color: #4a90e2;
		text-decoration: none;
		word-break: break-all;
	}

	.detail-value a:hover {
		text-decoration: underline;
	}
</style> 