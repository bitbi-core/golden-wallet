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
	let copiedAddress: string | null = null;

	$: {
		curWallet = $curWalletStore;
		loadAddresses(curWallet);
	}

	function isAddrLoaded(addr: string) {
		return addresses.some((a) => a.address === addr && a.timestamp);
	}

	async function loadAddressesForLabel(wallet: string, label: string) {
		const labeledAddrs: IAddressInfo[] = [];
		const addrs = (await getAddressesByLabel(wallet, label)) || [];
		for (const addr of addrs) {
			if (isAddrLoaded(addr)) {
				continue;
			}
			const addrInfo = await getAddressInfo(wallet, addr);
			labeledAddrs.push(addrInfo);
		}
		return labeledAddrs;
	}

	async function loadAddresses(wallet: string) {
		let newAddrs: IAddressInfo[] = [];
		try {
			const labels = await listLabels(wallet);
			for (const label of labels) {
				const a = await loadAddressesForLabel(wallet, label);
				newAddrs = [...newAddrs, ...a];
			}
			newAddrs.sort((a, b) => b.timestamp - a.timestamp);
			addresses = newAddrs;
		} catch (e) {
			console.error('Error loading addresses:', e);
		}
	}

	async function generateAddress() {
		if (!label) {
			alert('Please enter a label');
			return;
		}
		try {
			const addr = await getNewAddress(curWallet, label, addressType);
			const addrInfo = await getAddressInfo(curWallet, addr);
			addresses = [addrInfo, ...addresses];
			label = ''; // Reset label after successful generation
		} catch (e) {
			console.error('Error generating address:', e);
			alert('Failed to generate address. Please try again.');
		}
	}

	function copyAddress(address: string) {
		navigator.clipboard.writeText(address);
		copiedAddress = address;
		setTimeout(() => {
			if (copiedAddress === address) {
				copiedAddress = null;
			}
		}, 2000);
	}

	function formatAddress(address: string) {
		return getShorter(address);
	}

	// Pagination
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

<div class="receive-container">
	<div class="generate-section">
		<h2>Generate New Address</h2>
		<form on:submit|preventDefault={generateAddress}>
			<div class="form-group">
				<label for="addressType">Address Type</label>
				<select id="addressType" bind:value={addressType} required>
					{#each addressTypes as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>
			
			<div class="form-group">
				<label for="label">Label</label>
				<input 
					id="label"
					bind:value={label} 
					placeholder="Enter a label for this address"
					required 
				/>
			</div>

			<button type="submit" class="generate-button">
				Generate New Address
			</button>
		</form>
	</div>

	<div class="addresses-section">
		<h2>Your Addresses</h2>
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>Type</th>
						<th>Label</th>
						<th>Address</th>
						<th>Action</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedAddresses as { type, labels, address }}
						<tr>
							<td class="type-cell">{type}</td>
							<td class="label-cell">{labels.join(', ')}</td>
							<td class="address-cell">{formatAddress(address)}</td>
							<td class="action-cell">
								<button 
									class="copy-button" 
									class:copied={copiedAddress === address}
									on:click={() => copyAddress(address)}
								>
									{copiedAddress === address ? 'Copied!' : 'Copy'}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			{#if addresses.length > itemsPerPage}
				<div class="pagination">
					<div class="pagination-controls">
						<button 
							class="page-button"
							on:click={() => currentPage = 1}
							disabled={currentPage === 1}
							title="First page"
						>
							<span>«</span>
						</button>
						<button 
							class="page-button" 
							on:click={prevPage} 
							disabled={currentPage === 1}
							title="Previous page"
						>
							<span>‹</span>
						</button>

						<div class="page-numbers">
							{#if currentPage > 2}
								<button class="page-number" on:click={() => currentPage = 1}>1</button>
								{#if currentPage > 3}
									<span class="page-ellipsis">...</span>
								{/if}
							{/if}

							{#if currentPage > 1}
								<button class="page-number" on:click={() => currentPage = currentPage - 1}>
									{currentPage - 1}
								</button>
							{/if}

							<button class="page-number active">{currentPage}</button>

							{#if currentPage < totalPages}
								<button class="page-number" on:click={() => currentPage = currentPage + 1}>
									{currentPage + 1}
								</button>
							{/if}

							{#if currentPage < totalPages - 1}
								{#if currentPage < totalPages - 2}
									<span class="page-ellipsis">...</span>
								{/if}
								<button class="page-number" on:click={() => currentPage = totalPages}>
									{totalPages}
								</button>
							{/if}
						</div>

						<button 
							class="page-button" 
							on:click={nextPage} 
							disabled={currentPage === totalPages}
							title="Next page"
						>
							<span>›</span>
						</button>
						<button 
							class="page-button"
							on:click={() => currentPage = totalPages}
							disabled={currentPage === totalPages}
							title="Last page"
						>
							<span>»</span>
						</button>
					</div>
					<div class="page-info">
						Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, addresses.length)} of {addresses.length} addresses
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.receive-container {
		display: flex;
		gap: 24px;
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
	}

	.generate-section {
		flex: 0 0 350px;
	}

	.addresses-section {
		flex: 1;
		min-width: 0; /* Prevents flex item from overflowing */
	}

	h2 {
		margin: 0 0 20px;
		color: #333;
		font-size: 1.5rem;
	}

	.generate-section, .addresses-section {
		background: white;
		border-radius: 12px;
		padding: 24px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.form-group {
		margin-bottom: 20px;
	}

	label {
		display: block;
		margin-bottom: 8px;
		font-weight: 600;
		color: #333;
	}

	input, select {
		width: 100%;
		padding: 12px;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		font-size: 1rem;
		transition: all 0.2s ease;
		box-sizing: border-box;
	}

	input:focus, select:focus {
		border-color: #4CAF50;
		box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
		outline: none;
	}

	.generate-button {
		width: 100%;
		padding: 12px;
		background: #4CAF50;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.generate-button:hover {
		background: #43A047;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 20px;
	}

	th, td {
		padding: 12px;
		text-align: left;
		border-bottom: 1px solid #f0f0f0;
	}

	th {
		font-weight: 600;
		color: #666;
		background: #f9f9f9;
	}

	tr:hover {
		background: #f9f9f9;
	}

	.type-cell {
		width: 120px;
		color: #666;
	}

	.label-cell {
		width: 150px;
	}

	.address-cell {
		font-family: monospace;
		color: #333;
	}

	.action-cell {
		width: 100px;
	}

	.copy-button {
		padding: 6px 12px;
		background: #E8F5E9;
		color: #4CAF50;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.copy-button:hover {
		background: #C8E6C9;
	}

	.copy-button.copied {
		background: #4CAF50;
		color: white;
	}

	.pagination {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		margin-top: 24px;
		padding-top: 24px;
		border-top: 1px solid #f0f0f0;
	}

	.pagination-controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.page-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		cursor: pointer;
		color: #666;
		font-weight: 500;
		font-size: 1.2rem;
		transition: all 0.2s ease;
	}

	.page-button:hover:not(:disabled) {
		background: #f5f5f5;
		border-color: #d0d0d0;
		color: #333;
	}

	.page-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: #f9f9f9;
	}

	.page-numbers {
		display: flex;
		align-items: center;
		gap: 4px;
		margin: 0 8px;
	}

	.page-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 6px;
		cursor: pointer;
		color: #666;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.page-number:hover:not(.active) {
		background: #f5f5f5;
		border-color: #d0d0d0;
		color: #333;
	}

	.page-number.active {
		background: #4CAF50;
		border-color: #4CAF50;
		color: white;
		cursor: default;
	}

	.page-ellipsis {
		color: #666;
		padding: 0 4px;
	}

	.page-info {
		color: #666;
		font-size: 0.9rem;
		text-align: center;
	}
</style>
