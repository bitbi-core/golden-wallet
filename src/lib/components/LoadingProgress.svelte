<script lang="ts">
    import { formatNumber } from '$lib/utils';
    export let progress = 0;
</script>

<div class="popup">
    <div class="popup-content">
        <h2>Please wait...</h2>
        <p>We're preparing your wallet information. This may take a few minutes.</p>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: {progress}%;"></div>
        </div>
        <p>Progress: {formatNumber(progress)}%</p>
    </div>
</div>

<style>
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
</style> 