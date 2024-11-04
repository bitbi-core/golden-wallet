<script lang="ts">
	import { sleep } from '$lib/utils';
	import { onMount } from 'svelte';
	import { curBcInfo } from '$lib/store';
	import Modal from '$lib/components/Model.svelte';

	import {
		getMinerThreads,
		isMinerRunning,
		isMinerScheduled,
		scheduleMiner,
		setMinerThreads,
		startMiner,
		stopMiner,
		unscheduleMiner
	} from '$lib/miner-utils';

	$: isReady = !$curBcInfo.initialblockdownload && $curBcInfo.blocks === $curBcInfo.headers;

	let threads = getMinerThreads() || 1;
	let isRunning = false;
	let isScheduled = false;
	let popupMessage = '';
	$: isInputVisible = isReady ? !isRunning : !isRunning && !isScheduled;
	$: {
		console.log('miner waiting bitbid isReady:', isReady);
		setMinerThreads(threads);
	}

	onMount(() => {
		let cancel = false;
		async function checkRunningLoop() {
			//load saved threads number set on last time
			isScheduled = await isMinerScheduled();
			isRunning = await isMinerRunning();
			for (; !cancel; ) {
				try {
					await sleep(10000);
					isScheduled = isMinerScheduled();
					isRunning = await isMinerRunning();
					console.log('get minerd running and scheduled:', isRunning, isScheduled);
				} catch (e) {
					console.log('checkRunningLoop error:', e);
				}
			}
		}
		checkRunningLoop();
		return () => (cancel = true);
	});

	async function startMining() {
		isRunning = true;
		popupMessage = 'Starting mining...';
		await startMiner();
		popupMessage = 'Mining started!';
		setTimeout(() => (popupMessage = ''), 2000);
	}

	async function stopMining() {
		isRunning = false;
		popupMessage = 'Stopping mining...';
		await unscheduleMining();
		await stopMiner();
		popupMessage = 'Mining stopped!';
    	setTimeout(() => (popupMessage = ''), 2000);
	}

	async function scheduleMining() {
		isScheduled = true;
		await scheduleMiner();
	}

	async function unscheduleMining() {
		isScheduled = false;
		await unscheduleMiner();
	}
</script>

<div class="main">
	<div class="status-section">
		{#if !isReady}
			<div class="status not-ready">Node is not ready yet, waiting...</div>
		{/if}
		{#if isRunning}
			<div class="status running">{`Miner working with ${threads} threads`}</div>
		{:else if isScheduled && !isReady}
			<div class="status scheduled">
				Miner is scheduled to start with {threads} threads when Node is ready
			</div>
		{:else}
			<div class="status stopped">Miner stopped</div>
		{/if}
	</div>
	{#if isInputVisible}
		<div class="input-group">
			<label for="threads">Number of threads:</label>
			<input id="threads" type="number" min="1" bind:value={threads} />
		</div>
		<div class="button-group">
			{#if isReady}
				<button class="start-mining" disabled={popupMessage !== ''} on:click={startMining}>Start Mining</button>
			{:else}
				<button class="schedule-mining" on:click={scheduleMining}>Schedule Mining</button>
			{/if}
		</div>
	{:else}
		<div class="button-group">
			{#if isRunning}
				<button class="stop-mining" disabled={popupMessage !== ''} on:click={stopMining}>Stop Mining</button>
			{:else}
				<button class="unschedule-mining" on:click={unscheduleMining}>Unschedule Mining</button>
			{/if}
		</div>
	{/if}
	{#if popupMessage}
		<Modal message={popupMessage} />
	{/if}
</div>

<style>
	.main {
		margin: 20px;
		font-family: Arial, sans-serif;
	}
	.status-section {
		margin: 20px 0;
		padding: 10px;
		border-radius: 5px;
		font-size: 1.2em;
		box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
	}
	.status {
		padding: 10px;
		border-radius: 5px;
		color: white;
		margin: 10px 0;
		box-shadow: 0px 0px 5px rgba(0, 0, 0, 0.1);
	}
	.status.not-ready {
		background-color: #f0ad4e;
	}
	.status.running {
		background-color: #5cb85c;
	}
	.status.scheduled {
		background-color: #5bc0de;
	}
	.status.stopped {
		background-color: #d9534f;
	}
	.input-group {
		margin-bottom: 20px;
	}

	.input-group input {
		width: 100px; /* Adjust as needed */
		height: 1.5em;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.button-group {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}
	.button-group button {
		padding: 10px 20px;
		font-size: 1em;
		border: none;
		border-radius: 5px;
		color: white;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}
	.button-group button:disabled {
		background-color: #ccc;
		color: #888;
		cursor: not-allowed;
	}
	button.start-mining {
		background-color: #4caf50;
	}

	button.schedule-mining {
		background-color: #4caf50;
	}

	button.start-mining:hover {
		background-color: #45a049;
	}

	button.schedule-mining:hover {
		background-color: #45a049;
	}

	button.stop-mining {
		background-color: #f44336;
	}

	button.stop-mining:hover {
		background-color: #d32f2f;
	}
	button.unschedule-mining {
		background-color: #f44336;
	}

	button.unschedule-mining:hover {
		background-color: #d32f2f;
	}
	
</style>
