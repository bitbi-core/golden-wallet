<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { curWalletStore } from '$lib/store';
	import { getAddressesByLabel, getNewAddress, getWalletEthPrvKey, getWalletIdAndEthAddr } from '$lib/wallet-utils';
	import type { ITransaction, IUnwrapTransaction, IWrapTransaction } from '$lib/types';
	import { createSignedEthTransaction, createSignedBtbTransaction } from '$lib/bridge-utils';
	import { BRIDGE_SERVER_URL } from '$lib/config';


	let currentWallet: string;
	let btbReceivingAddress: string = '';
	let ethReceivingAddress: string = '';
	let amount: number = 0;
	let direction: 'btb_to_wbtb' | 'wbtb_to_btb' = 'btb_to_wbtb';
	let wrapFee: { btb_fee: number; eth_fee_in_wbtb: number } = { btb_fee: 0, eth_fee_in_wbtb: 0 };
	let unwrapFee: { btb_fee: number; eth_fee: number, eth_gas_price: string, eth_gas_limit: number } = { btb_fee: 0, eth_fee: 0, eth_gas_price: '0', eth_gas_limit: 0 };
    let min_wrap_amount: number = 0;
    let bridge_btb_address: string = '';
    let wbtb_contract_address: string = '';
    let wbtb_contract_abi: any[] = [];
	let wrapHistory: IWrapTransaction[] = [];
	let unwrapHistory: IUnwrapTransaction[] = [];
	let feeUpdateInterval: ReturnType<typeof setInterval>;
	let historyUpdateInterval: ReturnType<typeof setInterval>;
	let balanceUpdateInterval: ReturnType<typeof setInterval>;  // Add this line
	let minUnwrapAmount: number = 0;
	let walletEthAddress: string = '';
	let walletEthBalance: number = 0;
	let walletWbtbBalance: number = 0;
	
	
	$: {
		currentWallet = $curWalletStore;
		if (currentWallet) {
			loadBTBAddress();
		}
	}

	async function loadBTBAddress() {
		const addresses = await getAddressesByLabel(currentWallet, 'bridge');
		if (addresses && addresses.length > 0) {
			btbReceivingAddress = addresses[0];
		} else {
			btbReceivingAddress = await getNewAddress(currentWallet, 'bridge', 'bech32')
		}
		const walletInfo = await getWalletIdAndEthAddr(currentWallet);
		console.log("loadBTBAddress walletInfo:", walletInfo);
		walletEthAddress = walletInfo.ethAddr || '';
	}
	interface WrapFee {
		btb_fee: number;
		eth_fee_in_wbtb: number;
	}

	interface UnwrapFee {
		btb_fee: number;
		eth_fee: number;
		eth_gas_price: string;
		eth_gas_limit: number;
	}

	interface BridgeInfo {
		wbtb_contract_abi: any[];
		wrap_fee: WrapFee;
		unwrap_fee: UnwrapFee;
        min_wrap_amount: number;
        min_unwrap_amount: number;
        bridge_btb_address: string;
        wbtb_contract_address: string;
	}

	async function fetchBridgeInfo() {
		try {
			const response = await fetch(`${BRIDGE_SERVER_URL}/bridge-info`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data: BridgeInfo = await response.json();
            if (data.wbtb_contract_abi && JSON.stringify(data.wbtb_contract_abi) !== JSON.stringify(wbtb_contract_abi)) {
                wbtb_contract_abi = data.wbtb_contract_abi;
            }
            if (data.wrap_fee && (data.wrap_fee.btb_fee !== wrapFee.btb_fee || data.wrap_fee.eth_fee_in_wbtb !== wrapFee.eth_fee_in_wbtb)) {
                wrapFee = data.wrap_fee;
            }
            if (data.unwrap_fee && (data.unwrap_fee.btb_fee !== unwrapFee.btb_fee || data.unwrap_fee.eth_fee !== unwrapFee.eth_fee || data.unwrap_fee.eth_gas_price !== unwrapFee.eth_gas_price || data.unwrap_fee.eth_gas_limit !== unwrapFee.eth_gas_limit)) {
                unwrapFee = data.unwrap_fee;
            }
            if (data.min_wrap_amount && data.min_wrap_amount !== min_wrap_amount) {
                min_wrap_amount = data.min_wrap_amount;
            }
            if (data.bridge_btb_address && data.bridge_btb_address !== bridge_btb_address) {
                bridge_btb_address = data.bridge_btb_address;
            }
            if (data.wbtb_contract_address && data.wbtb_contract_address !== wbtb_contract_address) {
                wbtb_contract_address = data.wbtb_contract_address;
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
			walletWbtbBalance = data.wbtb_balance || 0;

		} catch (error) {
			console.error('Error fetching ETH and WBTB balances:', error);
		}
	}

	$: {
		if (direction === 'wbtb_to_btb' && walletEthAddress) {
			fetchEthBalance();
		}
	}

	function startPeriodicUpdates() {
		fetchBridgeInfo();
		fetchBridgeHistory();
		if (walletEthAddress) {
			fetchEthBalance();  // Add this line
		}
		feeUpdateInterval = setInterval(fetchBridgeInfo, 20000);
		historyUpdateInterval = setInterval(fetchBridgeHistory, 20000);
		balanceUpdateInterval = setInterval(() => {  // Add this block
			if (walletEthAddress) {
				fetchEthBalance();
			}
		}, 20000);
	}

	async function fetchBridgeHistory() {
        const { walletId } = await getWalletIdAndEthAddr(currentWallet);
        const wrapResponse = await fetch(`${BRIDGE_SERVER_URL}/wrap-history/${walletId}`);
        wrapHistory = await wrapResponse.json();
		wrapHistory.sort((a: IWrapTransaction, b: IWrapTransaction) => b.create_time > a.create_time ? 1 : -1);	
        
		const unwrapResponse = await fetch(`${BRIDGE_SERVER_URL}/unwrap-history/${walletId}`);
        unwrapHistory = await unwrapResponse.json();
		unwrapHistory.sort((a: IUnwrapTransaction, b: IUnwrapTransaction) => b.create_time > a.create_time ? 1 : -1);	
	}

	async function initiateBridge() {
		if (direction === 'btb_to_wbtb') {
			// Implement BTB to WBTB wrapping logic
            const signedBtbTransaction = await createSignedBtbTransaction(currentWallet, bridge_btb_address, ethReceivingAddress, amount);
            if (signedBtbTransaction) {
                const response = await fetch(`${BRIDGE_SERVER_URL}/initiate-wrap/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        signed_btb_tx: signedBtbTransaction
                    })
                });
                const result = await response.json();
                console.log('Wrap initiated:', result);
            } else {
                console.log('Failed to create signed BTB transaction');
            }
		} else {
			// Implement WBTB to BTB unwrapping logic
            const privateKey = await getWalletEthPrvKey(currentWallet);
			if (!privateKey) {
				console.error("privateKey not found")
				throw new Error("generate eth private key error")
			}
            const signedEthTransaction = await createSignedEthTransaction(currentWallet, amount, btbReceivingAddress, 
				privateKey, wbtb_contract_abi, wbtb_contract_address, unwrapFee.eth_gas_price, unwrapFee.eth_gas_limit);

			const response = await fetch(`${BRIDGE_SERVER_URL}/initiate-unwrap`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
                    signed_eth_tx: signedEthTransaction
				})
			});
			const result = await response.json();
			console.log('Unwrap initiated:', result);
		}
		fetchBridgeHistory();
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
		if (balanceUpdateInterval) {  // Add this block
			clearInterval(balanceUpdateInterval);
		}
	});

	function isWrapTransaction(transaction: IWrapTransaction | IUnwrapTransaction): transaction is IWrapTransaction {
		return 'receiving_address' in transaction;
	}
</script>

<div class="bridge-container">
	<h1>Bridge BTB and WBTB</h1>

	<div class="bridge-form">
		<label>
			Direction:
			<select bind:value={direction}>
				<option value="btb_to_wbtb">BTB to WBTB</option>
				<option value="wbtb_to_btb">WBTB to BTB</option>
			</select>
		</label>

		{#if direction === 'btb_to_wbtb'}
			<label>
				Amount:
				<input 
					type="number" 
					bind:value={amount} 
					min={direction === 'btb_to_wbtb' ? min_wrap_amount : 0} 
					step="1000" 
				/>
			</label>

			<label>
				Receiving Ethereum Address:
				<input type="text" bind:value={ethReceivingAddress} required />
			</label>
			{#if direction === 'btb_to_wbtb' && ethReceivingAddress.trim() === ''}
				<p class="error-message">Ethereum address is required</p>
			{/if}

			{#if direction === 'btb_to_wbtb' && amount < min_wrap_amount}
				<p class="error-message">Minimum wrap amount is {min_wrap_amount} BTB</p>
			{/if}
		{:else}
			<div class="unwrap-info">
				<p>Send WBTB to this Ethereum address for unwrapping:</p>
				<p class="eth-address">{walletEthAddress}</p>
				<p>Your WBTB Balance: {walletWbtbBalance} WBTB</p>
				<p>Your ETH Balance: {walletEthBalance} ETH</p>
			</div>

			<label>
				Amount to Unwrap:
				<input 
					type="number" 
					bind:value={amount} 
					min={minUnwrapAmount}
					max={walletWbtbBalance}
					step="1000"
				/>
			</label>
			{#if amount < minUnwrapAmount}
				<p class="error-message">Minimum unwrap amount is {minUnwrapAmount} WBTB</p>
			{/if}
			{#if amount > walletWbtbBalance}
				<p class="error-message">Amount exceeds your WBTB balance</p>
			{/if}
			{#if walletEthBalance < unwrapFee.eth_fee}
				<p class="error-message">Insufficient ETH balance for unwrapping. You need at least {unwrapFee.eth_fee} ETH to cover the fee.</p>
			{/if}
		{/if}

		<button on:click={initiateBridge} disabled={
			(direction === 'btb_to_wbtb' && (ethReceivingAddress.trim() === '' || amount < min_wrap_amount)) ||
			(direction === 'wbtb_to_btb' && (amount < minUnwrapAmount || amount > walletWbtbBalance || walletEthBalance < unwrapFee.eth_fee))
		}>
			Initiate Bridge
		</button>
	</div>

	<div class="fee-info">
		<h2>Current Fees</h2>
		<p>
			Wrap Fee(Estimated): {wrapFee.btb_fee} BTB + {wrapFee.eth_fee_in_wbtb} WBTB
			<span class="tooltip"
				>?
				<span class="tooltiptext"
					>The fee for wrapping BTB to WBTB includes a BTB fee and an ETH fee (in WBTB).</span
				>
			</span>
		</p>
		<p>
			Unwrap Fee(Estimated): {unwrapFee.btb_fee} BTB + {unwrapFee.eth_fee} ETH
			<span class="tooltip"
				>?
				<span class="tooltiptext"
					>The fee for unwrapping WBTB to BTB includes a BTB fee and an ETH fee.</span
				>
			</span>
		</p>
	</div>

	<div class="bridge-history">
		<h2>{direction === 'btb_to_wbtb' ? 'Wrap' : 'Unwrap'} History</h2>
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
				{#each (direction === 'btb_to_wbtb' ? wrapHistory : unwrapHistory) as transaction}
					<tr>
						<td>{new Date(transaction.create_time).toLocaleString()}</td>
						<td>{transaction.amount} {direction === 'btb_to_wbtb' ? 'BTB' : 'WBTB'}</td>
						<td>{transaction.status}</td>
						<td>
							<details>
								<summary>View Details</summary>
								{#if isWrapTransaction(transaction)}
									<p>BTB Transaction ID: {transaction.btb_tx_id}</p>
									{#if transaction.eth_tx_hash}
										<p>ETH Transaction Hash: {transaction.eth_tx_hash}</p>
									{/if}
									<p>Receiving Address: {transaction.receiving_address}</p>
									{#if transaction.minted_wbtb_amount !== null}
										<p>Minted WBTB: {transaction.minted_wbtb_amount}</p>
									{/if}
								{:else}
									<p>ETH Transaction Hash: {transaction.eth_tx_hash}</p>
									{#if transaction.btb_tx_id}
										<p>BTB Transaction ID: {transaction.btb_tx_id}</p>
									{/if}
									<p>Receiving Address: {transaction.btb_receiving_address}</p>
								{/if}
								{#if transaction.exception_count > 0}
									<p>Exceptions: {transaction.exception_count}</p>
									<p>Last Exception: {transaction.last_exception_time ? new Date(transaction.last_exception_time).toLocaleString() : 'N/A'}</p>
									<p>Exception Details: {transaction.exception_details}</p>
								{/if}
							</details>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.bridge-container {
		max-width: 100%;
		margin: 0 auto;
		padding: 20px;
	}

	.bridge-form {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 20px;
	}

	.bridge-form label {
		display: flex;
		flex-direction: column;
	}

	.fee-info {
		margin-bottom: 20px;
	}

	.tooltip {
		position: relative;
		display: inline-block;
		border-bottom: 1px dotted black;
		cursor: help;
	}

	.tooltip .tooltiptext {
		visibility: hidden;
		width: 200px;
		background-color: #555;
		color: #fff;
		text-align: center;
		border-radius: 6px;
		padding: 5px;
		position: absolute;
		z-index: 1;
		bottom: 125%;
		left: 50%;
		margin-left: -100px;
		opacity: 0;
		transition: opacity 0.3s;
	}

	.tooltip:hover .tooltiptext {
		visibility: visible;
		opacity: 1;
	}

	.bridge-history table {
		width: 100%;
		border-collapse: collapse;
	}

	.bridge-history th,
	.bridge-history td {
		border: 1px solid #ddd;
		padding: 8px;
		text-align: left;
	}

	.bridge-history th {
		background-color: #f2f2f2;
	}

	.error-message {
		color: red;
		font-size: 0.9em;
		margin-top: 5px;
	}

	.unwrap-info {
		background-color: #f0f0f0;
		padding: 10px;
		border-radius: 5px;
		margin-bottom: 10px;
	}

	.eth-address {
		font-family: monospace;
		word-break: break-all;
		background-color: #e0e0e0;
		padding: 5px;
		border-radius: 3px;
	}
</style>