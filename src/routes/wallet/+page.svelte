<script lang="ts">
	import { curBcInfo, curWalletInfoStore, curWalletStore } from '$lib/store';
	import { formatNumber } from '$lib/utils';
	import { consolidateAllUtxos } from '$lib/tasks/consolidateUtxos';
	import { makeRpcRequest } from '$lib/test';
	import { onMount } from 'svelte';

	let availableBalance = 0.0;
	let pendingBalance = 0.0;
	let immatureBalance = 0.0;
	let totalBalance = availableBalance + pendingBalance;
	$: loading = $curBcInfo.initialblockdownload || $curBcInfo.blocks !== $curBcInfo.headers;
	$: loadingProgress = $curBcInfo.headers ? ($curBcInfo.blocks / $curBcInfo.headers) * 100 : 0;
	$: isCaughtUp = loadingProgress === 100 && !loading;
	
	$: {
		console.log('wallet page isCaughtUp:', isCaughtUp, loadingProgress)
		console.log('wallet page curWalletStore:', $curWalletStore)
		console.log('wallet page curWalletInfoStore:', $curWalletInfoStore)
		const wInfo = $curWalletInfoStore;
		if (isCaughtUp && wInfo) {
			availableBalance = wInfo.balance || 0;
			pendingBalance = wInfo.unconfirmed_balance || 0;
			immatureBalance = wInfo.immature_balance || 0;
			totalBalance = availableBalance + pendingBalance + immatureBalance;
			// if (totalBalance > 0) {
			// 	consolidateAllUtxos($curWalletStore).then(count => {
			// 		console.log("consolidation count:", count);
			// 	}).catch(err => {
			// 		console.error("consolidation error:", err);
			// 	}).finally(() => {
			// 		console.log("consolidation complete");
			// 	});
			// }
		}
	}

	const uniswapLink = "https://app.uniswap.org/explore/tokens/ethereum/0x8defe5b69c162cd9bb5e4d2b61cf68602d442eb1";
	// onMount(() => {
	// 	window.makeRpcRequest = makeRpcRequest;
	// });
</script>

<div class="main">
	<div class="balances">
		<div>
			<h2>
				Balances

				<!-- <img src="alert-icon.png" alt="Alert Icon" width="20" height="20" /> -->
			</h2>
			<!-- {#if loading}
            <span class="loading-status"> Loading...</span>
        {/if} -->
		</div>
		<div class="balance-item">
			<span>Available:</span> <span>{availableBalance.toFixed(4)} BTB</span>
		</div>
		<div class="balance-item">
			<span>Pending:</span> <span>{pendingBalance.toFixed(4)} BTB</span>
		</div>
		<div class="balance-item">
			<span>Immature:</span> <span>{immatureBalance.toFixed(4)} BTB</span>
		</div>
		<hr />
		<div class="balance-item">
			<span>Total:</span> <span>{totalBalance.toFixed(4)} BTB</span>
		</div>
		<!-- <div class="swap-link">
			<a href={uniswapLink} target="_blank" rel="noopener noreferrer">Swap eBTB for ETH on Uniswap</a>
			<p class="swap-tip">Tip: Click Swap to quickly sell your eBTB(wrapped BTB on ethereum) on Uniswap.</p>
		</div> -->
	</div>
	{#if loadingProgress < 100}
		<div class="popup">
			<div class="popup-content">
				<h2>Please wait...</h2>
				<p>We're preparing your wallet information. This may take a few minutes.</p>
				<div class="progress-bar">
					<div class="progress-bar-fill" style="width: {loadingProgress}%;"></div>
				</div>
				<p>Progress: {formatNumber(loadingProgress)}%</p>
			</div>
		</div>
		
	{/if}
</div>

<style>
	.main {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.popup {
		position: absolute;
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

	.popup-content {
		background-color: white;
		padding: 30px;
		border-radius: 12px;
		width: 80%;
		max-width: 500px;
		text-align: center;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.popup-content h2 {
		margin: 0 0 15px 0;
		color: #333;
	}

	.progress-bar {
		background-color: #E8F5E9;
		border-radius: 8px;
		width: 100%;
		height: 12px;
		margin: 20px 0;
		overflow: hidden;
	}

	.progress-bar-fill {
		background-color: #4CAF50;
		height: 100%;
		border-radius: 8px;
		transition: width 0.3s ease;
	}

	.balances {
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
		background-color: #ffffff;
		border-radius: 12px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 25px;
	}

	.balances h2 {
		display: flex;
		align-items: center;
		font-size: 1.75rem;
		margin: 0 0 25px 0;
		color: #333;
		padding-bottom: 15px;
		border-bottom: 2px solid #E8F5E9;
	}

	.balance-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 15px;
		border-bottom: 1px solid #f0f0f0;
		font-size: 1.1rem;
	}

	.balance-item:last-child {
		border-bottom: none;
		margin-top: 10px;
		padding-top: 20px;
		border-top: 2px solid #E8F5E9;
	}

	.balance-item span:first-child {
		color: #666;
		font-weight: 500;
	}

	.balance-item span:last-child {
		font-weight: 600;
		color: #333;
	}

	.balance-item:last-child span {
		font-size: 1.2rem;
		font-weight: 600;
	}

	.balance-item:last-child span:last-child {
		color: #4CAF50;
	}

	hr {
		border: none;
		border-top: 1px solid #f0f0f0;
		margin: 15px 0;
	}

	.swap-link {
		margin-top: 25px;
		text-align: center;
		padding-top: 20px;
		border-top: 1px solid #f0f0f0;
	}

	.swap-link a {
		display: inline-block;
		background-color: #4CAF50;
		color: white;
		padding: 12px 24px;
		border-radius: 6px;
		text-decoration: none;
		font-weight: 600;
		transition: background-color 0.2s ease;
	}

	.swap-link a:hover {
		background-color: #43A047;
	}

	.swap-tip {
		font-size: 0.9rem;
		color: #666;
		margin-top: 12px;
	}
</style>
