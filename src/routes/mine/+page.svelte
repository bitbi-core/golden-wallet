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

	// State management
	let threads = getMinerThreads() || 1;
	let isRunning = false;
	let isScheduled = false;
	let popupMessage = '';

	// Derived states
	$: isReady = !$curBcInfo.initialblockdownload && $curBcInfo.blocks === $curBcInfo.headers;
	$: isInputVisible = isReady ? !isRunning : !isRunning && !isScheduled;

	// Watch threads changes
	$: if (threads) {
		setMinerThreads(threads);
	}

	// Mining status polling
	onMount(() => {
		let isActive = true;
		
		async function updateMiningStatus() {
			try {
				isScheduled = await isMinerScheduled();
				isRunning = await isMinerRunning();
			} catch (e) {
				console.error('Failed to update mining status:', e);
			}
		}

		async function pollMiningStatus() {
			await updateMiningStatus();
			
			while (isActive) {
				await sleep(10000);
				await updateMiningStatus();
			}
		}

		pollMiningStatus();
		return () => {
			isActive = false;
		};
	});

	// UI feedback handler
	function showTemporaryMessage(message: string) {
		popupMessage = message;
		setTimeout(() => (popupMessage = ''), 2000);
	}

	// Mining control functions
	async function startMining() {
		try {
			popupMessage = 'Starting mining...';
			await startMiner();
			isRunning = true;
			showTemporaryMessage('Mining started!');
		} catch (e) {
			showTemporaryMessage('Failed to start mining!');
			console.error('Start mining error:', e);
		}
	}

	async function stopMining() {
		try {
			popupMessage = 'Stopping mining...';
			await stopMiner();
			isRunning = false;
			showTemporaryMessage('Mining stopped!');
		} catch (e) {
			showTemporaryMessage('Failed to stop mining!');
			console.error('Stop mining error:', e);
		}
	}

	async function scheduleMining() {
		try {
			await scheduleMiner();
			isScheduled = true;
			showTemporaryMessage('Mining scheduled!');
		} catch (e) {
			showTemporaryMessage('Failed to schedule mining!');
			console.error('Schedule mining error:', e);
		}
	}

	async function unscheduleMining() {
		try {
			await unscheduleMiner();
			isScheduled = false;
			showTemporaryMessage('Mining unscheduled!');
		} catch (e) {
			showTemporaryMessage('Failed to unschedule mining!');
			console.error('Unschedule mining error:', e);
		}
	}
</script>

<div class="main">
	<h1>Mining Control</h1>
	<div class="card">
		<div class="status-section">
			{#if !isReady}
				<div class="status not-ready">
					<i class="fas fa-clock"></i>
					<span>Node is not ready yet, waiting...</span>
				</div>
			{/if}
			{#if isRunning}
				<div class="status running">
					<i class="fas fa-cog fa-spin"></i>
					<span>Miner working with {threads} threads</span>
				</div>
			{:else if isScheduled && !isReady}
				<div class="status scheduled">
					<i class="fas fa-calendar-check"></i>
					<span>Miner is scheduled to start with {threads} threads when Node is ready</span>
				</div>
			{:else}
				<div class="status stopped">
					<i class="fas fa-stop-circle"></i>
					<span>Miner stopped</span>
				</div>
			{/if}
		</div>

		{#if isInputVisible}
			<div class="control-section">
				<div class="input-group">
					<label for="threads">Number of threads:</label>
					<input id="threads" type="number" min="1" bind:value={threads} />
				</div>
				<div class="button-group">
					{#if isReady}
						<button class="start-mining" disabled={popupMessage !== ''} on:click={startMining}>
							<i class="fas fa-play"></i> Start Mining
						</button>
					{:else}
						<button class="schedule-mining" on:click={scheduleMining}>
							<i class="fas fa-clock"></i> Schedule Mining
						</button>
					{/if}
				</div>
			</div>
		{:else}
			<div class="button-group">
				{#if isRunning}
					<button class="stop-mining" disabled={popupMessage !== ''} on:click={stopMining}>
						<i class="fas fa-stop"></i> Stop Mining
					</button>
				{:else}
					<button class="unschedule-mining" on:click={unscheduleMining}>
						<i class="fas fa-calendar-times"></i> Unschedule Mining
					</button>
				{/if}
			</div>
		{/if}
	</div>
	{#if popupMessage}
		<Modal message={popupMessage} />
	{/if}
</div>

<style>
	.main {
		max-width: 800px;
		margin: 2rem auto;
		padding: 0 1rem;
		font-family: 'Segoe UI', system-ui, sans-serif;
	}

	h1 {
		color: #2c3e50;
		text-align: center;
		margin-bottom: 2rem;
		font-weight: 600;
	}

	.card {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.status-section {
		margin-bottom: 2rem;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.5rem;
		border-radius: 8px;
		font-size: 1.1rem;
		transition: all 0.3s ease;
	}

	.status i {
		font-size: 1.4rem;
	}

	.status.not-ready {
		background-color: #fff3cd;
		color: #856404;
		border: 1px solid #ffeeba;
	}

	.status.running {
		background-color: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
	}

	.status.scheduled {
		background-color: #cce5ff;
		color: #004085;
		border: 1px solid #b8daff;
	}

	.status.stopped {
		background-color: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}

	.control-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.input-group {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.input-group label {
		font-weight: 500;
		color: #2c3e50;
		min-width: 140px;
	}

	.input-group input {
		width: 120px;
		padding: 0.5rem;
		border: 2px solid #e2e8f0;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.3s ease;
	}

	.input-group input:focus {
		outline: none;
		border-color: #4299e1;
	}

	.button-group {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.button-group button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 500;
		border: none;
		border-radius: 6px;
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.button-group button:disabled {
		background-color: #e2e8f0;
		color: #a0aec0;
		cursor: not-allowed;
		transform: none;
	}

	.button-group button:not(:disabled):hover {
		transform: translateY(-2px);
	}

	button.start-mining,
	button.schedule-mining {
		background-color: #48bb78;
	}

	button.start-mining:hover,
	button.schedule-mining:hover {
		background-color: #38a169;
	}

	button.stop-mining,
	button.unschedule-mining {
		background-color: #f56565;
	}

	button.stop-mining:hover,
	button.unschedule-mining:hover {
		background-color: #e53e3e;
	}

	@media (max-width: 640px) {
		.main {
			margin: 1rem;
		}

		.card {
			padding: 1rem;
		}

		.input-group {
			flex-direction: column;
			align-items: flex-start;
		}

		.input-group input {
			width: 100%;
		}

		.button-group button {
			width: 100%;
			justify-content: center;
		}
	}
</style>
