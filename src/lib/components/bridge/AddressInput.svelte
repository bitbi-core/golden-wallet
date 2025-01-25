<script lang="ts">
	import { goto } from '$app/navigation';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { slide } from 'svelte/transition';

	export let direction: 'btb_to_ebtb' | 'ebtb_to_btb';
	export let ethReceivingAddress: string;
	export let showAddressInfo: boolean;
	export let walletEthAddress: string;
</script>

{#if direction === 'btb_to_ebtb'}
	<div class="address-input">
		<label for="ethReceivingAddress">BTB Receiving Address on Ethereum</label>
		<div class="address-field">
			<input 
				id="ethReceivingAddress"
				type="text" 
				bind:value={ethReceivingAddress}
				placeholder="Enter your Ethereum address"
				class="eth-address-input"
			/>
		</div>
	</div>
{:else if showAddressInfo}
	<div class="address-info" class:show={showAddressInfo} transition:slide>
		<div class="address-info-content">
			<label for="walletEthAddress">
				Wallet's ETH Address
				<span class="highlighted-text">(send eBTB out to this address for bridging)</span>:
			</label>
			<div class="address-row">
				<div class="address-display-container" id="walletEthAddress">
					<div class="address-text">{walletEthAddress || ''}</div>
					<div class="copy-button-container">
						<CopyButton text={walletEthAddress} />
					</div>
				</div>
				<button class="secondary-button send-eth-button" on:click={() => goto('/bridge/send-eth')}>
					Send ETH Out
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.address-input {
		margin-top: 24px;
		margin-bottom: 24px;
		background: #f8f9fa;
		padding: 16px;
		border-radius: 12px;
	}

	.address-input label {
		display: block;
		font-size: 14px;
		color: #666;
		margin-bottom: 8px;
	}

	.address-field {
		background: white;
		border-radius: 8px;
		padding: 4px;
	}

	.eth-address-input {
		width: 100%;
		padding: 12px;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-size: 14px;
		font-family: monospace;
		background: white;
	}

	.eth-address-input:focus {
		outline: none;
		border-color: #4a90e2;
		box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
	}

	.eth-address-input::placeholder {
		color: #999;
	}

	.address-info {
		background: #f8f9fa;
		padding: 16px 20px;
		border-radius: 12px;
		margin-top: 12px;
		border: 1px solid #e9ecef;
		opacity: 0;
		max-height: 0;
		overflow: hidden;
		transition: all 0.3s ease-in-out;
	}

	.address-info.show {
		opacity: 1;
		max-height: 200px;
	}

	.address-info-content {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.address-info-content label {
		font-size: 14px;
		color: #495057;
		font-weight: 500;
	}

	.address-row {
		display: flex;
		gap: 16px;
		align-items: center;
		width: 100%;
	}

	.address-display-container {
		background: white;
		padding: 12px 16px;
		border-radius: 8px;
		border: 1px solid #dee2e6;
		font-family: monospace;
		font-size: 15px;
		display: flex;
		align-items: center;
		gap: 12px;
		flex: 1;
		min-width: 0;
		box-shadow: 0 1px 3px rgba(0,0,0,0.05);
	}

	.address-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		color: #2c3e50;
		letter-spacing: 0.5px;
		min-width: 0;
	}

	.copy-button-container {
		flex-shrink: 0;
	}

	.send-eth-button {
		white-space: nowrap;
		padding: 12px 24px;
		min-width: fit-content;
		font-size: 14px;
		font-weight: 500;
		max-width: 200px;
	}

	.secondary-button {
		background: #6c757d;
		color: white;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 1px 3px rgba(0,0,0,0.1);
	}

	.secondary-button:hover {
		background: #5a6268;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0,0,0,0.15);
	}

	.highlighted-text {
		color: #ff5722;
		font-weight: 500;
		font-size: 13px;
	}
</style> 