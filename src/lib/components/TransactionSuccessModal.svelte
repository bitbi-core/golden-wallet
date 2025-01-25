<script lang="ts">
    export let txId: string;
    export let onClose: () => void;
</script>

<div class="modal">
    <div class="modal-content">
        <h2>Transaction successful!</h2>
        <p>
            Transaction ID: <a href="https://explorer.bitbi.org/tx/{txId}" target="_blank">{txId}</a>
        </p>
        <button on:click={onClose}>Close</button>
    </div>
</div>

<style>
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .modal-content {
        background: white;
        padding: 30px;
        border-radius: 12px;
        text-align: center;
        max-width: 500px;
        width: 90%;
    }

    h2 {
        margin: 0 0 20px;
        color: #333;
    }

    a {
        color: #4CAF50;
        text-decoration: none;
        word-break: break-all;
    }

    a:hover {
        text-decoration: underline;
    }

    button {
        background-color: #4CAF50;
        color: white;
        border: none;
        padding: 12px 24px;
        cursor: pointer;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 600;
        margin-top: 20px;
        transition: background-color 0.2s ease;
    }

    button:hover {
        background-color: #43A047;
    }
</style> 