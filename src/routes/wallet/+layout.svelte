<script lang="ts">
	import TabNavigation from '$lib/components/TabNavigation.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { curBcInfo, curWalletInfoStore } from '$lib/store';
	import LoadingProgress from '$lib/components/LoadingProgress.svelte';

	const tabs = ['Overview', 'Send', 'Receive', 'Transactions'];
	$: activeTab = $page.url.pathname.split('/').pop() || 'overview';
	
	function handleTabChange(tab: string) {
		const route = tab.toLowerCase();
		if (route === 'overview') {
			goto('/wallet');
		} else {
			goto(`/wallet/${route}`);
		}
	}

	$: loading = $curBcInfo.initialblockdownload || $curBcInfo.blocks !== $curBcInfo.headers;
	$: loadingProgress = $curBcInfo.headers ? ($curBcInfo.blocks / $curBcInfo.headers) * 100 : 0;

	$: isCaughtUp = !$curBcInfo.initialblockdownload && $curBcInfo.blocks === $curBcInfo.headers;
	$: walletReady = !!$curWalletInfoStore && isCaughtUp;
</script>

<div class="wallet-layout">
	<TabNavigation {tabs} {activeTab} onTabChange={handleTabChange} />

	<div class="content">
		<slot />
	</div>

	{#if loadingProgress < 100}
		<LoadingProgress progress={loadingProgress} />
	{/if}
</div>

<style>
	.wallet-layout {
		position: relative;
		width: 100%;
		height: 100%;
		padding: 24px;
	}

	.content {
		position: relative;
	}

	.container {
		display: flex;
		flex-direction: column;
		padding: 20px;
		font-family: Arial, sans-serif;
		color: #333;
		height: 100%;
		max-width: 1200px;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.nav-bar {
		display: flex;
		justify-content: space-around;
		background-color: #ffffff;
		padding: 15px;
		border-radius: 8px;
		margin-bottom: 25px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.nav-bar a, .nav-bar span {
		text-decoration: none;
		color: #666;
		font-weight: 600;
		padding: 8px 20px;
		flex: 1;
		text-align: center;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.nav-bar a:hover {
		background-color: #f5f5f5;
		color: #333;
	}

	.nav-bar a.active {
		color: #4CAF50;
		background-color: #E8F5E9;
	}

	.nav-bar span {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		flex: 1;
		background-color: #ffffff;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 20px;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #f5f5f5;
		min-height: 100vh;
	}
</style>
