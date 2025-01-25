<script lang="ts">
	import { goto } from '$app/navigation';

	export let direction: 'btb_to_ebtb' | 'ebtb_to_btb';
	export let amount: number;
	export let receivedAmount: number;
	export let walletBtbBalance: number;
	export let walletWbtbBalance: number;
	export let walletEthBalance: number;
	export let min_wrap_amount: number;
	export let wrapFee: { btb_fee: number; eth_fee_in_ebtb: number };
	export let unwrapFee: { btb_fee: number; eth_fee: number };
	export let showAddressInfo: boolean;

	$: sendTokenLabel = direction === 'btb_to_ebtb' ? 'BTB' : 'eBTB';
	$: receiveTokenLabel = direction === 'btb_to_ebtb' ? 'eBTB' : 'BTB';
</script>

<div class="amount-section">
	<div class="amount-inputs-row">
		<div class="amount-input">
			<label for="sendAmount">You send</label>
			<div class="amount-field">
				<input 
					id="sendAmount"
					type="number" 
					bind:value={amount}
					min={direction === 'btb_to_ebtb' ? min_wrap_amount : 0}
					step="0.00000001"
					placeholder="0.00000000"
				/>
				<span class="token-symbol">{sendTokenLabel}</span>
			</div>
			{#if direction === 'btb_to_ebtb'}
				<div class="available-amount">
					Available: {walletBtbBalance.toFixed(2)} BTB
				</div>
				{#if amount < min_wrap_amount}
					<div class="warning-text">
						Minimum bridge amount is {min_wrap_amount} BTB
					</div>
				{/if}
			{:else}
				<div class="available-amounts">
					<div class="balance-row">
						<span>Available: {walletWbtbBalance.toFixed(2)} eBTB</span>
						<button class="secondary-button send-ebtb-button" on:click={() => showAddressInfo = !showAddressInfo}>
							Send eBTB In
						</button>
					</div>
					<div>ETH Balance: {walletEthBalance.toFixed(6)} ETH</div>
					<button class="toggle-button" on:click={() => showAddressInfo = !showAddressInfo}>
						{showAddressInfo ? 'Show less' : 'Show wallet Ethereum address'}
					</button>
				</div>
			{/if}
		</div>

		<div class="amount-input">
			<label for="receivedAmount">You receive (estimated)</label>
			<div class="amount-field receive-field">
				<input 
					id="receivedAmount"
					type="number" 
					value={receivedAmount}
					disabled
					placeholder="0.000000"
				/>
				<div class="token-label">: {receiveTokenLabel}</div>
			</div>
		</div>
	</div>

	{#if direction === 'btb_to_ebtb'}
		<div class="fee-info">
			Network fee: {wrapFee.btb_fee + wrapFee.eth_fee_in_ebtb} BTB
		</div>
	{:else}
		<div class="fee-info">
			Network fee: {unwrapFee.btb_fee} BTB + {unwrapFee.eth_fee} ETH
		</div>
	{/if}
</div>

<style>
	.amount-section {
		display: flex;
		flex-direction: column;
		gap: 24px;
		margin-top: 16px;
		margin-bottom: 16px;
	}

	.amount-inputs-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		align-items: start;
	}

	.amount-input {
		flex: 1;
		background: white;
		padding: 20px;
		border-radius: 12px;
		min-width: 0;
		border: 1px solid #e8e8e8;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
		transition: all 0.2s ease;
	}

	.amount-input:hover {
		border-color: #d9d9d9;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	label {
		display: block;
		font-size: 14px;
		color: #8c8c8c;
		margin-bottom: 12px;
		font-weight: 500;
	}

	.amount-field {
		display: flex;
		align-items: center;
		gap: 12px;
		background: #f8f9fa;
		padding: 12px 16px;
		border-radius: 8px;
		border: 1px solid #f0f0f0;
		transition: all 0.2s ease;
	}

	.amount-field:focus-within {
		border-color: #4a90e2;
		box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
	}

	.amount-field input {
		flex: 1;
		background: transparent;
		border: none;
		font-size: 24px;
		font-weight: 500;
		padding: 8px 0;
		width: 100%;
		min-width: 0;
		color: #262626;
	}

	.amount-field input:focus {
		outline: none;
		box-shadow: none;
	}

	.amount-field input:disabled {
		color: #595959;
		opacity: 0.8;
	}

	.token-symbol {
		font-size: 20px;
		font-weight: 600;
		color: #262626;
		min-width: fit-content;
	}

	.available-amount {
		font-size: 14px;
		color: #8c8c8c;
		margin-top: 12px;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.available-amount::before {
		content: "💰";
		font-size: 12px;
	}

	.fee-info {
		font-size: 14px;
		color: #595959;
		background: #f8f9fa;
		padding: 16px;
		border-radius: 12px;
		text-align: center;
		border: 1px solid #f0f0f0;
	}

	.available-amounts {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 12px;
		color: #8c8c8c;
		font-size: 14px;
	}

	.balance-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.balance-info {
		flex: 1;
		min-width: 150px;
	}

	.send-ebtb-button {
		font-size: 13px;
		padding: 6px 12px;
		height: 32px;
		min-width: 100px;
		max-width: fit-content;
		background: #4a90e2;
		border-radius: 6px;
		transition: all 0.2s ease;
		white-space: nowrap;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.send-ebtb-button:hover {
		background: #357abd;
		transform: translateY(-1px);
	}

	.toggle-button {
		background: none;
		border: none;
		color: #4a90e2;
		padding: 4px 0;
		cursor: pointer;
		font-size: 14px;
		text-align: left;
		margin-top: 8px;
		transition: color 0.2s ease;
	}

	.toggle-button:hover {
		color: #357abd;
	}

	.receive-field {
		opacity: 0.9;
		background: #fafafa;
	}

	.receive-field input {
		color: #595959;
	}

	.token-label {
		white-space: nowrap;
		color: #595959;
		font-size: 20px;
		font-weight: 600;
	}

	.warning-text {
		color: #ff4d4f;
		font-size: 13px;
		margin-top: 8px;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: #fff2f0;
		border-radius: 6px;
		border: 1px solid #ffccc7;
	}

	.warning-text::before {
		content: "⚠️";
		font-size: 14px;
	}

	.secondary-button {
		background: #6c757d;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.secondary-button:hover {
		background: #5a6268;
		transform: translateY(-1px);
	}

	input[type="number"] {
		-moz-appearance: textfield;
	}

	input[type="number"]::-webkit-inner-spin-button,
	input[type="number"]::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
</style> 