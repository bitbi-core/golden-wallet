<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { curWalletStore, curWalletInfoStore } from '$lib/store';
	import { getAddressesByLabel, getNewAddress } from '$lib/wallet-utils';
	import type { ITransaction, IUnwrapTransaction, IWrapTransaction } from '$lib/types/index';
	import { createSignedEthTransaction, createSignedBtbTransaction } from '$lib/bridge-utils';
	import { BRIDGE_SERVER_URL } from '$lib/config';
	import ClosableModal from '$lib/components/ClosableModel.svelte';
	import { goto } from '$app/navigation';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { walletId, ethAddress, ethPrivateKey } from '$lib/stores/wallet-store';
	import { slide } from 'svelte/transition';

	// Import new components
	import NetworkSelector from '$lib/components/bridge/NetworkSelector.svelte';
	import BridgeInfo from '$lib/components/bridge/BridgeInfo.svelte';
	import AmountInput from '$lib/components/bridge/AmountInput.svelte';
	import AddressInput from '$lib/components/bridge/AddressInput.svelte';
	import TransactionHistory from '$lib/components/bridge/TransactionHistory.svelte';

	let currentWallet: string;
	let btbReceivingAddress: string = '';
	let ethReceivingAddress: string = '';
	let amount: number = 0;
	let receivedAmount: number = 0;
	let fromNetwork: 'Bitbi' | 'Ethereum' = 'Bitbi';
	let toNetwork: 'Bitbi' | 'Ethereum' = 'Ethereum';
	let direction: 'btb_to_ebtb' | 'ebtb_to_btb' = 'btb_to_ebtb';
	let wrapFee: { btb_fee: number; eth_fee_in_ebtb: number } = { btb_fee: 0, eth_fee_in_ebtb: 0 };
	let unwrapFee: { btb_fee: number; eth_fee: number, eth_gas_price: string, eth_gas_limit: number } = { btb_fee: 0, eth_fee: 0, eth_gas_price: '0', eth_gas_limit: 0 };
	let min_wrap_amount: number = 0;
	let max_wrap_amount: number = 0;
	let bridge_btb_address: string = '';
	let ebtb_contract_address: string = '';
	let ebtb_contract_abi: any[] = [];
	let wrapHistory: IWrapTransaction[] = [];
	let unwrapHistory: IUnwrapTransaction[] = [];
	let feeUpdateInterval: ReturnType<typeof setInterval>;
	let historyUpdateInterval: ReturnType<typeof setInterval>;
	let balanceUpdateInterval: ReturnType<typeof setInterval>;
	let minUnwrapAmount: number = 0;
	let walletEthAddress: string = '';
	let walletEthBalance: number = 0;
	let walletWbtbBalance: number = 0;
	let walletBtbBalance: number = 0;
	let isLoading = false;
	let showErrorModal = false;
	let errorMessage = '';
	let showSuccessModal = false;
	let successMessage = '';
	let showAddressInfo = false;
	let showBridgeInfo = false;
	let showDetailsModal = false;
	let selectedTransaction: IWrapTransaction | IUnwrapTransaction | null = null;

	function swapDirection() {
		[fromNetwork, toNetwork] = [toNetwork, fromNetwork];
		direction = fromNetwork === 'Bitbi' ? 'btb_to_ebtb' : 'ebtb_to_btb';
	}

	$: {
		direction = fromNetwork === 'Bitbi' ? 'btb_to_ebtb' : 'ebtb_to_btb';
		// Calculate received amount accounting for fees
		if (direction === 'btb_to_ebtb') {
			receivedAmount = amount > 0 ? Math.max(0, amount - wrapFee.btb_fee - wrapFee.eth_fee_in_ebtb) : 0;
		} else {
			receivedAmount = amount > 0 ? Math.max(0, amount - unwrapFee.btb_fee) : 0;
		}
	}

	$: {
		// Prevent selecting the same network for both sides
		if (fromNetwork === toNetwork) {
			toNetwork = fromNetwork === 'Bitbi' ? 'Ethereum' : 'Bitbi';
		}
	}

	$: {
		currentWallet = $curWalletStore;
		if (currentWallet) {
			loadBTBAddress();
		}
		console.log("ethAddress:", $ethAddress)
	}

	async function loadBTBAddress() {
		const addresses = await getAddressesByLabel(currentWallet, 'bridge');
		if (addresses && addresses.length > 0) {
			btbReceivingAddress = addresses[0];
		} else {
			btbReceivingAddress = await getNewAddress(currentWallet, 'bridge', 'bech32')
		}
		walletEthAddress = $ethAddress || '';
	}

	$: {
		const wInfo = $curWalletInfoStore;
		if (wInfo) {
			walletBtbBalance = wInfo.balance || 0;
		}
	}

	interface WrapFee {
		btb_fee: number;
		eth_fee_in_ebtb: number;
	}

	interface UnwrapFee {
			btb_fee: number;
			eth_fee: number;
			eth_gas_price: string;
			eth_gas_limit: number;
	}

	interface BridgeInfo {
		ebtb_contract_abi: any[];
		wrap_fee: WrapFee;
		unwrap_fee: UnwrapFee;
        min_wrap_amount: number;
        max_wrap_amount: number;
        min_unwrap_amount: number;
        bridge_btb_address: string;
        ebtb_contract_address: string;
	}

	async function fetchBridgeInfo() {
		try {
			const response = await fetch(`${BRIDGE_SERVER_URL}/bridge-info`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data: BridgeInfo = await response.json();
            if (data.ebtb_contract_abi && JSON.stringify(data.ebtb_contract_abi) !== JSON.stringify(ebtb_contract_abi)) {
                ebtb_contract_abi = data.ebtb_contract_abi;
            }
            if (data.wrap_fee && (data.wrap_fee.btb_fee !== wrapFee.btb_fee || data.wrap_fee.eth_fee_in_ebtb !== wrapFee.eth_fee_in_ebtb)) {
                wrapFee = data.wrap_fee;
            }
            if (data.unwrap_fee && (data.unwrap_fee.btb_fee !== unwrapFee.btb_fee || data.unwrap_fee.eth_fee !== unwrapFee.eth_fee || data.unwrap_fee.eth_gas_price !== unwrapFee.eth_gas_price || data.unwrap_fee.eth_gas_limit !== unwrapFee.eth_gas_limit)) {
                unwrapFee = data.unwrap_fee;
            }
            if (data.min_wrap_amount && data.min_wrap_amount !== min_wrap_amount) {
                min_wrap_amount = data.min_wrap_amount;
            }
            if (data.max_wrap_amount && data.max_wrap_amount !== max_wrap_amount) {
                max_wrap_amount = data.max_wrap_amount;
            }
            if (data.bridge_btb_address && data.bridge_btb_address !== bridge_btb_address) {
                bridge_btb_address = data.bridge_btb_address;
            }
            if (data.ebtb_contract_address && data.ebtb_contract_address !== ebtb_contract_address) {
                ebtb_contract_address = data.ebtb_contract_address;
            }
            if (data.min_unwrap_amount && data.min_unwrap_amount !== minUnwrapAmount) {
                minUnwrapAmount = data.min_unwrap_amount;
            }
		} catch (error) {
			console.error('Error fetching bridge info:', error);
			throw error;
		}
	}

	async function fetchEthBalance() {
		if (!walletEthAddress) {
			console.error('No Ethereum address available');
			return;
		}

		try {
			const response = await fetch(`${BRIDGE_SERVER_URL}/eth-address/${walletEthAddress}/balance`);
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			console.log("fetchEthBalance data:", data);
			walletEthBalance = data.eth_balance || 0;
			walletWbtbBalance = data.ebtb_balance || 0;

		} catch (error) {
			console.error('Error fetching ETH and BTB balances:', error);
		}
	}

	$: {
		if (direction === 'ebtb_to_btb' && walletEthAddress) {
			fetchEthBalance();
		}
	}

	function startPeriodicUpdates() {
		fetchBridgeInfo();
		fetchBridgeHistory();
		if (walletEthAddress) {
			fetchEthBalance();
		}
		feeUpdateInterval = setInterval(fetchBridgeInfo, 60000);
		historyUpdateInterval = setInterval(fetchBridgeHistory, 60000);
		balanceUpdateInterval = setInterval(() => {
			if (walletEthAddress) {
				fetchEthBalance();
			}
		}, 60000);
	}

	async function fetchBridgeHistory() {
        if (!$walletId) {
            console.error('No wallet ID available');
            return;
        }
        const wrapResponse = await fetch(`${BRIDGE_SERVER_URL}/wrap-history/${$walletId}`);
        wrapHistory = await wrapResponse.json();
		// add `0x` prefix to eth_tx_hash
		wrapHistory.forEach((tx: IWrapTransaction) => {
			if (tx.eth_tx_hash && !tx.eth_tx_hash.startsWith('0x')) {
				tx.eth_tx_hash = `0x${tx.eth_tx_hash}`;
			}
		});
        wrapHistory.sort((a: IWrapTransaction, b: IWrapTransaction) => b.create_time > a.create_time ? 1 : -1);	
        
        const unwrapResponse = await fetch(`${BRIDGE_SERVER_URL}/unwrap-history/${$walletId}`);
        unwrapHistory = await unwrapResponse.json();
		// add `0x` prefix to eth_tx_hash
		unwrapHistory.forEach((tx: IUnwrapTransaction) => {
			if (tx.eth_tx_hash && !tx.eth_tx_hash.startsWith('0x')) {
				tx.eth_tx_hash = `0x${tx.eth_tx_hash}`;
			}
		});
        unwrapHistory.sort((a: IUnwrapTransaction, b: IUnwrapTransaction) => b.create_time > a.create_time ? 1 : -1);	
	}

	async function initiateBridge() {
		isLoading = true;
		try {
			if (direction === 'btb_to_ebtb') {
				if (!$walletId) {
					throw new Error('Wallet ID not available');
				}
				const result = await createSignedBtbTransaction($walletId, bridge_btb_address, ethReceivingAddress, amount);
				if (result.error) {
					errorMessage = result.error;
					showErrorModal = true;
					return;
				}
				if (result.hex) {
					const response = await fetch(`${BRIDGE_SERVER_URL}/initiate-wrap/`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							signed_btb_tx: result.hex
						})
					});
					const responseData = await response.json();
					if (response.status !== 200) {
						if (responseData.detail && responseData.detail.includes("Error broadcasting transaction: -26: tx-size")) {
							errorMessage = "The transaction size is too large. Please try reducing the amount you're attempting to wrap.";
						} else {
							errorMessage = responseData.detail || 'An error occurred while initiating the wrap. Please try again.';
						}
						showErrorModal = true;
					} else {
						console.log('Wrap initiated:', responseData);
						successMessage = 'Wrap transaction initiated successfully! You can track its progress in the history section below.';
						showSuccessModal = true;
					}
				}
			} else {
				// Implement BTB unwrapping logic
				if (!$ethPrivateKey) {
					throw new Error('ETH private key not available');
				}
				if (!$walletId) {
					throw new Error('Wallet ID not available');
				}
				const signedEthTransaction = await createSignedEthTransaction($walletId, amount, btbReceivingAddress, 
					$ethPrivateKey, ebtb_contract_abi, ebtb_contract_address, unwrapFee.eth_gas_price, unwrapFee.eth_gas_limit);

				if (!signedEthTransaction || signedEthTransaction.error) {
					errorMessage = signedEthTransaction?.error || 'Failed to create signed transaction';
					showErrorModal = true;
					return;
				}

				const response = await fetch(`${BRIDGE_SERVER_URL}/initiate-unwrap/`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						signed_eth_tx: signedEthTransaction.rawTransaction
					})
				});
				const result = await response.json();
				console.log('Unwrap initiated:', result);
				successMessage = 'Unwrap transaction initiated successfully! You can track its progress in the history section below.';
				showSuccessModal = true;
			}
			fetchBridgeHistory();
		} catch (error: unknown) {
			console.error('Error during bridge initiation:', error);
			errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during bridge initiation. Please try again.';
			showErrorModal = true;
		} finally {
			isLoading = false;
		}
	}

	function closeErrorModal() {
		showErrorModal = false;
		errorMessage = '';
	}

	function closeSuccessModal() {
		showSuccessModal = false;
		successMessage = '';
	}

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

	onMount(() => {
		startPeriodicUpdates();
		if (walletEthAddress) {
			console.log("onMount fetchEthBalance direction:", direction, walletEthAddress);
				fetchEthBalance();
		}
	});

	onDestroy(() => {
		if (feeUpdateInterval) {
			clearInterval(feeUpdateInterval);
		}
		if (historyUpdateInterval) {
			clearInterval(historyUpdateInterval);
		}
		if (balanceUpdateInterval) {
			clearInterval(balanceUpdateInterval);
		}
	});

	function isWrapTransaction(transaction: IWrapTransaction | IUnwrapTransaction): transaction is IWrapTransaction {
		return 'receiving_address' in transaction;
	}


	function openDetailsModal(transaction: IWrapTransaction | IUnwrapTransaction) {
		selectedTransaction = transaction;
		showDetailsModal = true;
	}

	function closeDetailsModal() {
		showDetailsModal = false;
		selectedTransaction = null;
	}

	$: sendTokenLabel = direction === 'btb_to_ebtb' ? 'BTB' : 'eBTB';
	$: receiveTokenLabel = direction === 'btb_to_ebtb' ? 'eBTB' : 'BTB';

	$: {
		console.log('bridge Direction changed:', direction);
		console.log('bridge From network:', fromNetwork);
		console.log('bridge To network:', toNetwork);
	}
</script>

<div class="container">
	<h1 class="page-title">Bridge BTB</h1>

	<div class="card">
		<div class="bridge-form">
			<NetworkSelector bind:fromNetwork bind:toNetwork />

			<BridgeInfo {direction} bind:showBridgeInfo />

			<AmountInput
				{direction}
				bind:amount
				{receivedAmount}
				{walletBtbBalance}
				{walletWbtbBalance}
				{walletEthBalance}
				{min_wrap_amount}
				{wrapFee}
				{unwrapFee}
				bind:showAddressInfo
			/>

			<AddressInput
				{direction}
				bind:ethReceivingAddress
				bind:showAddressInfo
				{walletEthAddress}
			/>

			{#if direction === 'btb_to_ebtb' && ethReceivingAddress.trim() === ''}
				<p class="error-message">Ethereum address is required</p>
			{/if}

			{#if direction === 'btb_to_ebtb' && amount > max_wrap_amount}
				<p class="error-message">Maximum bridge amount is {max_wrap_amount} BTB</p>
			{/if}

			<button 
				class="primary-button"
				on:click={initiateBridge} 
				disabled={
					isLoading ||
					(direction === 'btb_to_ebtb' && (ethReceivingAddress.trim() === '' || amount < min_wrap_amount || amount > max_wrap_amount)) ||
					(direction === 'ebtb_to_btb' && (amount < minUnwrapAmount || amount > walletWbtbBalance || walletEthBalance < unwrapFee.eth_fee))
				}
			>
				{#if isLoading}
					<span class="loading-spinner"></span>
					Processing...
				{:else}
					Bridge
				{/if}
			</button>
		</div>
	</div>

	<TransactionHistory
		{direction}
		{wrapHistory}
		{unwrapHistory}
		bind:showDetailsModal
		bind:selectedTransaction
	/>

	{#if showErrorModal}
		<ClosableModal on:close={closeErrorModal}>
			<h2>Error</h2>
			<p>{errorMessage}</p>
			<button on:click={closeErrorModal}>Close</button>
		</ClosableModal>
	{/if}

	{#if showSuccessModal}
		<div 
			class="modal-overlay" 
			on:click={closeSuccessModal}  
			role="button" 
			tabindex="0" 
			on:keydown={(e) => e.key === 'Escape' && closeSuccessModal()}
		>
			<div class="success-modal">
				<div class="success-icon">✓</div>
				<h2>Success!</h2>
				<p>{successMessage}</p>
				<button on:click={closeSuccessModal}>Close</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 1000px;
		margin: 0 auto;
		padding: 20px;
		width: 100%;
		box-sizing: border-box;
	}

	.page-title {
		font-size: 28px;
		font-weight: bold;
		margin-bottom: 24px;
		color: #333;
		padding: 0 12px;
	}

	.card {
		background: white;
		border-radius: 12px;
		padding: 24px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		width: 100%;
		box-sizing: border-box;
		overflow: hidden;
	}

	.bridge-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1px;
		box-sizing: border-box;
	}

	.error-message {
		display: flex;
		align-items: center;
		background: #fff2f0;
		border-left: 4px solid #ff4d4f;
		padding: 12px;
		margin-bottom: 20px;
		border-radius: 4px;
		color: #cf1322;
	}

	.primary-button {
		width: 100%;
		padding: 12px;
		background: #4a90e2;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 16px;
		font-weight: bold;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.primary-button:hover:not(:disabled) {
		background: #357abd;
	}

	.primary-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading-spinner {
		display: inline-block;
		width: 20px;
		height: 20px;
		border: 2px solid #ffffff;
		border-radius: 50%;
		border-top: 2px solid transparent;
		animation: spin 1s linear infinite;
		margin-right: 8px;
		vertical-align: middle;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
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

	.success-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		padding: 24px;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 1000;
		max-width: 400px;
		width: 90%;
		text-align: center;
	}

	.success-modal h2 {
		color: #52c41a;
		margin-bottom: 16px;
	}

	.success-modal button {
		background: #52c41a;
		color: white;
		border: none;
		padding: 8px 16px;
		border-radius: 4px;
		cursor: pointer;
		margin-top: 16px;
	}

	.success-modal button:hover {
		background: #389e0d;
	}

	.success-icon {
		width: 48px;
		height: 48px;
		background: #52c41a;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 24px;
		margin: 0 auto 16px;
	}
</style>

