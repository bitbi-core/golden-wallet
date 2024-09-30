<script lang="ts">
	import { minerIsSwitchingWalletStore } from '$lib/miner-utils';
	import { page } from '$app/stores';
	import { MinerDefaultWallet, backupWallet, restoreWallet } from '$lib/wallet-utils';
	import { onMount } from 'svelte';
	import { save, open } from '@tauri-apps/api/dialog';
	import { goto } from '$app/navigation';

	import { toast } from '$lib/toast';
	import {
		errStore,
		allWalletsStore,
		curBcInfo,
		curWalletStore,
		curWalletInfoStore
	} from '$lib/store';
	import { CodeError, ErrorCode } from '$lib/error';

	let err: CodeError | null;
	$: wallets = $allWalletsStore || [];
	$: isWalletLoading = $curWalletStore !== $curWalletInfoStore?.walletname;
	$: isCaughtUp =
		!$curBcInfo.initialblockdownload &&
		$curBcInfo.blocks === $curBcInfo.headers &&
		$curBcInfo.headers > 0;
	$: {
		console.log('all wallets', $allWalletsStore);
		console.log('cur wallet', $curWalletStore);
		console.log('curWalletInfoStore', $curWalletInfoStore);
		err = $errStore;
	}

	onMount(() => {
		if ($page.url.pathname === '/') {
			goto('/wallet');
			return;
		}
	});

	async function backupWalletDialog() {
		// Add your backup wallet logic here
		console.log('Backup Wallet clicked');
		const filePath = await save({
			filters: [
				{
					name: 'Wallet',
					extensions: ['dat']
				}
			]
		});
		console.log('filePath:', filePath);
		if (!filePath) {
			console.log('No file path selected, cancelled');
			return;
		}
		try {
			await backupWallet(MinerDefaultWallet, filePath);
			toast('Wallet backed up successfully');
		} catch (e: unknown) {
			console.error('Error backing up wallet:', e);
			if (e instanceof Error) {
				const err = new CodeError(ErrorCode.BACKUP_WALLET_FAILED, e.message);
				errStore.set(err);
				return;
			}
			const err = new CodeError(ErrorCode.UNKNOWN);
			errStore.set(err);
			return;
		}
	}

	async function importWalletDialog() {
		// Add your import wallet logic here
		console.log('Import Wallet clicked');
		const selected = await open({
			title: 'Import Wallet',
			multiple: false,
			filters: [
				{
					name: 'Wallet',
					extensions: ['dat']
				}
			]
		});
		let walletFile: string;
		if (Array.isArray(selected)) {
			walletFile = selected[0];
		} else if (selected === null) {
			console.log('No file selected, cancelled');
			toast('No file selected, cancelled');
			return;
		} else {
			walletFile = selected;
		}
		// Ask the user for the wallet name
		const walletName = window.prompt('Please enter a new name of the wallet you want to import');
		if (walletName === null || walletName === '') {
			console.log('No wallet name entered, cancelled');
			toast('No wallet name entered, cancelled');
			return;
		}
		// Import the wallet
		try {
			await restoreWallet(walletName, walletFile);
			toast('Wallet imported successfully');
		} catch (e) {
			console.error('Error import wallet:', e);
			if (e instanceof Error) {
				const err = new CodeError(ErrorCode.RESTORE_WALLET_FAILED, e.message);
				errStore.set(err);
				return;
			}
			const err = new CodeError(ErrorCode.UNKNOWN);
			errStore.set(err);
			return;
		}
	}
</script>

<div id="errorModal" class="modal" style="display: {err ? 'block' : 'none'}">
	<div class="modal-content">
		<button class="close" on:click={() => (err = null)} aria-label="Close">&times;</button>
		{#if err}
			<p>Error Code: [{err.code}]</p>
			<p>Error Message: {err.message}</p>
		{/if}
	</div>
</div>
<main>
	<nav class="sidebar">
		<ul>
			<li class={$page.url.pathname.startsWith('/wallet') ? 'active' : ''}>
				<a href="/wallet"> Wallet </a>
			</li>
			<li class={$page.url.pathname === '/mine' ? 'active' : ''}>
				<a href="/mine"> Mine </a>
			</li>
			<li class={$page.url.pathname === '/bridge' ? 'active' : ''}>
				<a href="/bridge"> Bridge </a>
			</li>
		</ul>
	</nav>

	<section class="main-content">
		<div class="menu-bar">
			<ul>
				<li>
					<a href="#">File</a>
					<ul>
						<li><a href="#" on:click|preventDefault={backupWalletDialog}>Backup Wallet...</a></li>
						<li><a href="#" on:click|preventDefault={importWalletDialog}>Import Wallet...</a></li>
					</ul>
				</li>
			</ul>
			{#if isCaughtUp}
				<div class="wallet-selector">
					<span>current wallet: </span>
					<select bind:value={$curWalletStore} disabled={$minerIsSwitchingWalletStore}>
						{#each wallets as wallet (wallet)}
							<option>{wallet}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>
		<div class="content">
			<!-- content area -->
			<slot></slot>
		</div>
	</section>
	{#if isWalletLoading && isCaughtUp}
		<div class="popup">
			<div class="popup-content">
				<h2>Almost ready...</h2>
				<p>Your wallet is loading. This may take for a while.</p>
			</div>
		</div>
	{/if}
	{#if $minerIsSwitchingWalletStore && isCaughtUp}
		<div class="popup">
			<div class="popup-content">
				<h2>
					Switching mining to the wallet <span class="wallet-name">{$curWalletStore}</span>...
				</h2>
				<p>This may take for 2 minutes...</p>
			</div>
		</div>
	{/if}
</main>

<style>
	main {
		display: flex;
		height: 100%;
		font-family: Arial, sans-serif;
	}

	.wallet-name {
		color: #3498db; /* Change this to the color you want */
		font-weight: bold; /* Makes the text bold */
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
	}

	.popup-content {
		background-color: white;
		padding: 20px;
		border-radius: 10px;
		width: 80%;
		text-align: center;
	}

	nav.sidebar {
		background-color: #f8f9fa;
		width: 120px;
		padding: 20px;
		overflow: auto;
		padding: 1em;
	}

	nav.sidebar ul {
		list-style-type: none;
		padding: 0;
	}

	nav.sidebar ul li {
		margin-bottom: 1em;
	}

	nav.sidebar ul li a {
		color: #333;
		text-decoration: none;
	}

	nav.sidebar ul li a:hover {
		color: #007bff;
	}

	nav.sidebar ul li.active {
		background-color: #007bff;
		color: white;
		padding: 10px 5px;
		border-radius: 5px;
		transition: background-color 0.3s ease;
	}

	nav.sidebar ul li.active a {
		color: white;
		text-decoration: none;
	}

	nav.sidebar ul li.active:hover {
		background-color: #0056b3;
	}

	.main-content {
		flex: 1;
		padding: 0 4px;
		background-color: #f1f1f1;
	}

	.content {
		padding-left: 10px;
		padding-right: 10px;
	}
	.menu-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 10px;
		background-color: #f8f9fa;
	}
	.wallet-selector {
		display: flex;
		align-items: baseline;
		flex: 0 0 auto;
		background-color: #f8f9fa;
	}
	select {
		margin: 0 5px;
		padding: 0 5px;
		height: 2em;
		min-width: 5em;
		font-size: 16px;
		border: none;
		border-radius: 5px;
		background-color: #b9c1ca;
		color: #333;
		-webkit-appearance: none; /* Removes the default dropdown button in Chrome/Edge */
		-moz-appearance: none; /* Removes the default dropdown button in Firefox */
		appearance: none; /* Removes the default dropdown button in other browsers */
	}

	/* select:focus {
		outline: none;
	} */

	.menu-bar ul {
		list-style-type: none;
		padding: 0px;
		display: flex;
		justify-content: flex-start;

		border-radius: 5px;
		box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
		margin-block-start: 0px;
		margin-block-end: 10px;
		flex: 1 0 auto;
	}

	.menu-bar li {
		position: relative;
		padding: 10px 20px;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}

	.menu-bar li:hover {
		background-color: #e0e0e0;
	}

	.menu-bar li ul {
		display: none;
		position: absolute;
		top: 100%;
		left: 0;
		padding: 0;
		list-style-type: none;
		width: 15em;
		box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
		border-radius: 5px;
	}

	.menu-bar li ul li {
		padding: 10px 20px;
		background-color: #f8f9fa;
		transition: background-color 0.3s ease;
	}

	.menu-bar li ul li:hover {
		background-color: #e0e0e0;
	}

	.menu-bar li:hover ul {
		display: block;
	}

	.menu-bar a {
		text-decoration: none;
		color: #333;
		transition: color 0.3s ease;
	}

	.menu-bar a:hover {
		color: #007bff;
	}

	.modal {
		display: none; /* Hidden by default */
		position: fixed; /* Stay in place */
		z-index: 1; /* Sit on top */
		left: 0;
		top: 0;
		width: 100%; /* Full width */
		height: 100%; /* Full height */
		overflow: auto; /* Enable scroll if needed */
		background-color: rgb(0, 0, 0); /* Fallback color */
		background-color: rgba(0, 0, 0, 0.4); /* Black w/ opacity */
	}

	/* Modal Content/Box */
	.modal-content {
		background-color: #fefefe;
		margin: 15% auto; /* 15% from the top and centered */
		padding: 20px;
		border: 1px solid #888;
		width: 80%; /* Could be more or less, depending on screen size */
	}

	/* The Close Button */
	.close {
		color: #aaa;
		float: right;
		font-size: 28px;
		font-weight: bold;
	}

	.close:hover,
	.close:focus {
		color: black;
		text-decoration: none;
		cursor: pointer;
	}
</style>