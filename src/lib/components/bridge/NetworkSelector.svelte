<script lang="ts">
	export let fromNetwork: 'Bitbi' | 'Ethereum';
	export let toNetwork: 'Bitbi' | 'Ethereum';

	function swapDirection() {
		[fromNetwork, toNetwork] = [toNetwork, fromNetwork];
	}
</script>

<div class="network-selector">
	<div class="network-section">
		<label class="section-label" for="fromNetwork">From this network</label>
		<div class="network-dropdown">
			<select bind:value={fromNetwork} class="network-select" id="fromNetwork">
				<option value="Bitbi">Bitbi</option>
				<option value="Ethereum">Ethereum</option>
			</select>
		</div>
	</div>

	<button class="swap-button" on:click={swapDirection} aria-label="Swap direction">
		⇄
	</button>

	<div class="network-section">
		<label class="section-label" for="toNetwork">To this network</label>
		<div class="network-dropdown">
			<select bind:value={toNetwork} class="network-select" id="toNetwork">
				<option value="Bitbi">Bitbi</option>
				<option value="Ethereum">Ethereum</option>
			</select>
		</div>
	</div>
</div>

<style>
	.network-selector {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 4px;
	}

	.network-section {
		flex: 1;
	}

	.section-label {
		display: block;
		font-size: 14px;
		color: #666;
		margin-bottom: 8px;
	}

	.network-dropdown {
		position: relative;
	}

	.network-select {
		width: 100%;
		padding: 12px;
		padding-left: 40px;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-size: 16px;
		appearance: none;
		background: white;
		cursor: pointer;
	}

	.swap-button {
		width: 40px;
		height: 40px;
		border: 1px solid #ddd;
		border-radius: 50%;
		background: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		margin-top: 32px;
		transition: all 0.2s;
		color: #4a90e2;
	}

	.swap-button:hover {
		background: #f5f5f5;
		transform: scale(1.05);
		border-color: #4a90e2;
		color: #357abd;
	}
</style> 