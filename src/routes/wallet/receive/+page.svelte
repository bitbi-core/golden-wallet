<script lang="ts">
	import type { AddrType, IAddressInfo } from '$lib/types';
	import {
		getAddressInfo,
		getAddressesByLabel,
		getNewAddress,
		listLabels
	} from '$lib/wallet-utils';
	import { curWalletStore } from '$lib/store';
	import { getShorter } from '$lib/utils';
	let addressType: AddrType = 'bech32';
	let label = '';
	let addresses: IAddressInfo[] = [];
	let addressTypes: AddrType[] = ['p2sh-segwit', 'bech32', 'bech32m'];
	let curWallet: string;
	$: {
		curWallet = $curWalletStore;
		loadAddresses(curWallet);
	}

	function isAddrLoaded(addr: string) {
		return addresses.some((a) => a.address === addr && a.timestamp);
	}

	async function loadAddressesForLabel(wallet: string, label: string) {
		const labeledAddrs:IAddressInfo[] = [] ;
		const addrs = (await getAddressesByLabel(wallet, label)) || [];
		for (const addr of addrs) {
			if (isAddrLoaded(addr)) {
				continue;
			}
			const addrInfo = await getAddressInfo(wallet, addr);
			labeledAddrs.push(addrInfo);
		}
		//force update
		return labeledAddrs;
	}

	async function loadAddresses(wallet: string) {
		//1. loadlabels of current wallet
		//2. load addresses for each label of current wallet
		//3. get addresses info for each address
		let newAddrs: IAddressInfo[] = [];
		try {
			const labels = await listLabels(wallet);
			for (const label of labels) {
				const a = await loadAddressesForLabel(wallet, label);
				newAddrs = [...newAddrs, ...a];
			}
			// sort addresses by timestamp decending
			newAddrs.sort((a, b) => b.timestamp - a.timestamp);
			addresses = newAddrs;
		} catch (e) {
			console.error('Error loading addresses:', e);
		}
	}

	async function generateAddress() {
		console.log('generateAddress', addressType, label);
		const addr = await getNewAddress(curWallet, label, addressType);
		console.log('generateAddress new address:', addr);
		const addrInfo = await getAddressInfo(curWallet, addr);
		addresses = [addrInfo, ...addresses];
	}

	function copyAddress(address: string) {
		navigator.clipboard.writeText(address);
	}


	function formatAddress(address: string) {
        return getShorter(address);
    }

	// for address table pagination
	let currentPage = 1;
	const itemsPerPage = 10;
	let paginatedAddresses: IAddressInfo[];
	let totalPages: number;
    $: {
        totalPages = Math.ceil(addresses.length / itemsPerPage);
    }

	$: {
		const start = (currentPage - 1) * itemsPerPage;
		const end = start + itemsPerPage;
		paginatedAddresses = addresses.slice(start, end);
	}

	function nextPage() {
		if (currentPage * itemsPerPage < addresses.length) {
			currentPage++;
		}
	}

	function prevPage() {
		if (currentPage > 1) {
			currentPage--;
		}
	}

</script>

<div class="wrapper">
	<form on:submit|preventDefault={generateAddress}>
		<div>
			<span>Address Type:</span>
			<select bind:value={addressType} required>
				<!-- Change this line -->
				<option disabled value="">Select an address type</option>
				{#each addressTypes as type}
					<!-- Add these lines -->
					<option>{type}</option>
				{/each}
			</select>
		</div>
		<div>
			<span>Label:</span>
			<input bind:value={label} required />
		</div>
		<button type="submit">Generate Address</button>
	</form>

	<div class="table-container">
		<table>
			<thead>
				<tr>
					<th>Type</th>
					<th>Label</th>
					<th>Address</th>
					<th>Copy</th>
				</tr>
			</thead>
			<tbody>
				{#each paginatedAddresses as { type, labels, address }, i}
					<tr>
						<td>{type}</td>
						<td>{labels.join(',')}</td>
						<td>{formatAddress(address)}</td>
						<td><button on:click={() => copyAddress(address)}>Copy</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
		<div class="pagination">
			<button on:click={prevPage} disabled={currentPage === 1}>Previous</button>
			<span> {currentPage}/{totalPages} </span>
			<button on:click={nextPage} disabled={currentPage * itemsPerPage >= addresses.length}
				>Next</button
			>
		</div>
	</div>
</div>

<style>
	body {
		font-family: Arial, sans-serif;
		background-color: #f5f5f5;
		color: #333;
	}

	.wrapper {
		display: flex;
		justify-content: space-between;
		width: 100%;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1em;
		width: 100%;
		padding: 1em;
		background-color: #fff;
		border-radius: 8px;
		box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
		flex: 0.5;
		margin-right: 2em;
	}

	form div {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	form div span {
		font-weight: bold;
		margin-bottom: 0.5em;
	}

	input,
	select {
		padding: 0.5em;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.9em;
	}

	button {
		padding: 0.5em 1em;
		border: none;
		border-radius: 4px;
		background-color: #4caf50;
		color: white;
		cursor: pointer;
		transition: background-color 0.3s;
		font-size: 0.9em;
		margin-top: 1em;
	}

	button:hover {
		background-color: #45a049;
	}

	.table-container {
		flex: 1;
		background-color: #fff;
		border-radius: 8px;
		box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
		padding: 15px;
	}

	table {
		width: 100%;
		/* margin-top: 2em; */
		border-collapse: collapse;
	}

	th,
	td {
		border: 1px solid #ddd;
		padding: 0.5em;
		text-align: left;
		font-size: 0.9em;
	}

	td button {
		margin: 0;
        vertical-align: middle;
    }

	th {
		background-color: #4caf50;
		color: white;
	}

	tr:nth-child(even) {
		background-color: #f2f2f2;
	}
	.pagination {
		display: flex;
		justify-content: flex-end;
		gap: 1em;
        align-items: baseline;
	}
</style>
