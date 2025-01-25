<script lang="ts">
	import { curWalletInfoStore } from '$lib/store';
	import WalletBalance from '$lib/components/WalletBalance.svelte';

	let availableBalance = 0.0;
	let pendingBalance = 0.0;
	let immatureBalance = 0.0;
	
	$: {
		const wInfo = $curWalletInfoStore;
		if (wInfo) {
			availableBalance = wInfo.balance || 0;
			pendingBalance = wInfo.unconfirmed_balance || 0;
			immatureBalance = wInfo.immature_balance || 0;
		}
	}
</script>

<WalletBalance 
	{availableBalance}
	{pendingBalance}
	{immatureBalance}
/>
