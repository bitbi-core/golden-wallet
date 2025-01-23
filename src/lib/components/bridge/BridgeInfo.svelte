<script lang="ts">
	import { slide } from 'svelte/transition';
	export let direction: 'btb_to_ebtb' | 'ebtb_to_btb';
	export let showBridgeInfo: boolean;
</script>

<div class="bridge-info-toggle">
	<button class="toggle-button" on:click={() => showBridgeInfo = !showBridgeInfo}>
		<span class="finger-icon">👉</span>
		What is this? : {showBridgeInfo ? 'Show less' : 'Show more'}
	</button>
</div>

{#if showBridgeInfo}
	{#if direction === 'btb_to_ebtb'}
		<div class="bridge-info" transition:slide>
			<h3>Bridge BTB to Ethereum (eBTB)</h3>
			<p>To bridge your BTB tokens to Ethereum:</p>
			<ol>
				<li>Enter the amount of BTB you want to bridge</li>
				<li>Provide your Ethereum address where you want to receive the bridged tokens (eBTB)</li>
				<li>Click "Bridge" to initiate the transfer</li>
			</ol>
			<p class="note">Note: The bridging process may take a few minutes to complete.</p>
		</div>
	{:else}
		<div class="bridge-info" transition:slide>
			<h3>Bridge eBTB to Bitbi (BTB)</h3>
			<p>To bridge your eBTB tokens from Ethereum:</p>
			<ol>
				<li>Make sure you have enough ETH in your wallet's Ethereum address to pay for gas fees</li>
				<li>Enter the amount of eBTB you want to bridge</li>
				<li>Send your eBTB tokens to the Ethereum address shown below</li>
				<li>Click "Bridge" to initiate the transfer</li>
			</ol>
			<p class="note">Note: Insufficient ETH balance will cause the bridge transaction to fail.</p>
		</div>
	{/if}
{/if}

<style>
	.bridge-info-toggle {
		text-align: right;
		margin: 0 0 8px 0;
	}

	.toggle-button {
		background: none;
		border: none;
		color: #4a90e2;
		padding: 0;
		cursor: pointer;
		font-size: 14px;
		text-align: left;
	}

	.bridge-info {
		background: #f0f7ff;
		padding: 16px 20px;
		border-radius: 12px;
		margin: 16px 0;
		border: 1px solid #bae0ff;
	}

	.bridge-info h3 {
		color: #1890ff;
		margin: 0 0 12px 0;
		font-size: 16px;
		font-weight: 600;
	}

	.bridge-info p {
		margin: 0 0 12px 0;
		color: #333;
		font-size: 14px;
		line-height: 1.5;
		padding-left: 0;
	}

	.bridge-info ol {
		margin: 0 0 16px 0;
		padding-left: 35px;
		list-style-position: outside;
	}

	.bridge-info li {
		margin-bottom: 8px;
		color: #333;
		font-size: 14px;
		line-height: 1.5;
		padding-left: 8px;
		margin-left: 0;
	}

	.bridge-info li::marker {
		color: #1890ff;
		font-weight: 500;
	}

	.bridge-info .note {
		font-style: italic;
		color: #666;
		margin: 12px 0 0 0;
		font-size: 13px;
		line-height: 1.4;
	}

	.finger-icon {
		margin-right: 8px;
		font-size: 1.2em;
		animation: wiggle 1s infinite;
	}

	@keyframes wiggle {
		0% { transform: rotate(0deg); }
		25% { transform: rotate(15deg); }
		50% { transform: rotate(-15deg); }
		75% { transform: rotate(15deg); }
		100% { transform: rotate(0deg); }
	}
</style> 