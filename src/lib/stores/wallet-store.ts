import { writable, derived, get } from 'svelte/store';
import type { WalletKeys } from '../wallet-key-utils';
import { type BitcoinWalletData, type BitcoinDescriptor, deriveDescriptors } from '../bitcoin-utils';
import { generateNewWallet, deriveWalletKeys } from '../wallet-key-utils';
import { generateClientHmac, deriveClientEncryptionKey } from '../crypto-utils';
import { storeWalletData, retrieveWalletData, isWalletInitialized, clearWalletData, isWalletLocked, updateLastActivity } from '../storage-utils';
import { BRIDGE_SERVER_URL, DEFAULT_WALLET_NAME } from '$lib/config';
import { validateMnemonic } from '../wallet-key-utils';
import { WalletManager } from '../wallet-manager';
import { gRpcClient } from '../bitbi-rpc/index';
import type { ScanProgress } from '../types';

interface ServerError {
    message: string;
    tips: string[];
}

interface WalletState {
    isInitialized: boolean;
    isLocked: boolean;
    isLoading: boolean;
    walletData: WalletKeys | null;
    bitcoinData: BitcoinWalletData | null;
    error: string | null;
    showMnemonic?: boolean;
    mnemonic?: string;
    failedAttempts: number;
    serverError?: ServerError;
    isScanning: boolean;
    scanProgress?: ScanProgress;
    encryptionKey?: string;
}

function createWalletStore() {
    const { subscribe, set, update } = writable<WalletState>({
        isInitialized: false,
        isLocked: true,
        isLoading: false,
        walletData: null,
        bitcoinData: null,
        error: null,
        showMnemonic: false,
        mnemonic: undefined,
        failedAttempts: 0,
        isScanning: false,
        scanProgress: undefined,
        encryptionKey: undefined
    });

    // Add activity tracking
    let activityInterval: number;

    function startActivityTracking() {
        // Check every minute
        activityInterval = window.setInterval(() => {
            if (isWalletLocked()) {
                lockWallet();
                window.clearInterval(activityInterval);
            }
        }, 60000);
    }

    function handleScanProgress(
        progress: ScanProgress,
        blockchainInfo?: {
            initialBlockDownload: boolean;
            progress: number;
            blocks: number;
            headers: number;
        }
    ) {
        const tips: string[] = [];
        
        // Add blockchain sync status if available
        if (blockchainInfo) {
            if (blockchainInfo.initialBlockDownload) {
                // Calculate sync progress based on blocks/headers ratio
                const syncProgress = blockchainInfo.headers > 0 
                    ? (blockchainInfo.blocks / blockchainInfo.headers) * 100 
                    : 0;
                
                tips.push(`Blockchain syncing: ${syncProgress.toFixed(1)}%`);
                tips.push(`Blocks: ${blockchainInfo.blocks.toLocaleString()}/${blockchainInfo.headers.toLocaleString()}`);
            }
        }
        
        // Add wallet scanning progress
        tips.push(`Wallet scan: ${(progress.progress * 100).toFixed(1)}%`);
        
        if (progress.duration) {
            tips.push(`Scan duration: ${Math.round(progress.duration)}s`);
        }
        
        tips.push('Please wait while we process your wallet');
        
        if (blockchainInfo?.initialBlockDownload) {
            tips.push('Note: Initial blockchain download in progress');
            tips.push('The wallet will continue scanning as new blocks arrive');
        }

        update(state => ({
            ...state,
            isScanning: true,
            scanProgress: progress,
            serverError: {
                message: blockchainInfo?.initialBlockDownload 
                    ? 'Syncing blockchain and scanning wallet...'
                    : 'Scanning wallet...',
                tips
            }
        }));
    }

    async function initializeWallet(password: string, mnemonic?: string): Promise<boolean> {
        update(state => ({ ...state, isLoading: true, error: null }));
        try {
            const walletKeys = mnemonic ? deriveWalletKeys(mnemonic) : generateNewWallet();
            
            // Initialize core wallet first
            const walletInitialized = await WalletManager.initializeWallet();
            if (!walletInitialized) {
                throw new Error('Failed to initialize core wallet');
            }

            const clientHmac = await generateClientHmac(password);
            const response = await fetch(`${BRIDGE_SERVER_URL}/wallet/blind-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientHmac })
            });
            
            if (!response.ok) {
                throw new Error('Failed to get server blinded key');
            }
            
            const { blindedKey } = await response.json();
            const encryptionKey = await deriveClientEncryptionKey(password, blindedKey);
            
            // Derive and import descriptors with scan check
            const descriptors = deriveDescriptors(walletKeys.masterPrivateKey, walletKeys.masterPublicKey);
            const descriptorsImported = await WalletManager.importDescriptorsWithScanCheck(
                descriptors,
                handleScanProgress
            );
            
            if (!descriptorsImported) {
                throw new Error('Failed to import descriptors');
            }

            // Clear scanning state after successful import
            update(state => ({
                ...state,
                isScanning: false,
                scanProgress: undefined,
                serverError: undefined
            }));

            await storeWalletData(walletKeys, encryptionKey);
            
            if (!mnemonic) {
                update(state => ({
                    ...state,
                    showMnemonic: true,
                    mnemonic: walletKeys.mnemonic
                }));
            }
            
            update(state => ({
                ...state,
                isInitialized: true,
                isLocked: false,
                isLoading: false,
                walletData: walletKeys,
                bitcoinData: { 
                    descriptors,
                    masterFingerprint: walletKeys.walletId
                },
                error: null,
                failedAttempts: 0,
                encryptionKey
            }));
            
            return true;
        } catch (error) {
            console.error("initializeWallet error: ", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            update(state => ({
                ...state,
                isLoading: false,
                error: errorMessage,
                isScanning: false,
                scanProgress: undefined
            }));
            return false;
        }
    }

    // Add maximum password attempts handling
    const MAX_PASSWORD_ATTEMPTS = 3;

    async function unlockWallet(password: string): Promise<boolean> {
        update(state => ({ ...state, isLoading: true, error: null, serverError: undefined }));
        
        try {
            // Initialize core wallet first
            const walletInitialized = await WalletManager.initializeWallet();
            if (!walletInitialized) {
                throw new Error('Failed to initialize core wallet');
            }

            // Get encryption key from server
            const clientHmac = await generateClientHmac(password);
            const response = await fetch(`${BRIDGE_SERVER_URL}/wallet/blind-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientHmac })
            });
            
            if (!response.ok) {
                throw new Error('Server communication error');
            }
            
            const { blindedKey } = await response.json();
            const encryptionKey = await deriveClientEncryptionKey(password, blindedKey);
            
            // Retrieve and validate wallet data
            const result = await retrieveWalletData(encryptionKey);
            if (!result) {
                update(state => ({
                    ...state,
                    isLoading: false,
                    failedAttempts: state.failedAttempts + 1,
                    error: `Invalid password. You can keep trying or restore your wallet using your recovery phrase.`
                }));
                return false;
            }

            // Import descriptors and wait for scan to complete
            const descriptorsImported = await WalletManager.importDescriptorsWithScanCheck(
                result.bitcoinData.descriptors,
                handleScanProgress
            );

            if (!descriptorsImported) {
                throw new Error('Failed to import wallet descriptors');
            }

            // Update state with wallet data
            update(state => ({
                ...state,
                isLocked: false,
                isLoading: false,
                walletData: result.walletKeys,
                bitcoinData: result.bitcoinData,
                error: null,
                failedAttempts: 0,
                isScanning: false,
                scanProgress: undefined,
                serverError: undefined,
                encryptionKey
            }));

            // Start activity tracking
            updateLastActivity();
            startActivityTracking();
            
            return true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const tips = errorMessage.includes('Wallet is currently rescanning')
                ? [
                    'The wallet is currently being processed',
                    'Please wait for the scanning to complete',
                    'This may take a few minutes',
                    'Try again once the scanning is finished'
                  ]
                : [
                    'Check your internet connection',
                    'Make sure the server is running',
                    'Try again in a few moments',
                    'If the problem persists, contact support'
                  ];
            
            update(state => ({
                ...state,
                isLoading: false,
                error: errorMessage,
                isScanning: false,
                scanProgress: undefined,
                serverError: {
                    message: 'Wallet Operation Failed',
                    tips
                }
            }));
            return false;
        }
    }

    function lockWallet(): void {
        if (activityInterval) {
            window.clearInterval(activityInterval);
        }
        update(state => ({
            ...state,
            isLocked: true,
            walletData: null,
            bitcoinData: null,
            error: null,
            failedAttempts: 0
        }));
    }

    function resetWallet(): void {
        clearWalletData();
        set({
            isInitialized: false,
            isLocked: true,
            isLoading: false,
            walletData: null,
            bitcoinData: null,
            error: null,
            showMnemonic: false,
            mnemonic: undefined,
            failedAttempts: 0,
            isScanning: false,
            scanProgress: undefined,
            encryptionKey: undefined
        });
    }

    async function getEthPrivateKey(): Promise<string | null> {
        let currentState: WalletState | undefined;
        subscribe(state => { currentState = state })();
        return currentState?.walletData?.ethPrivateKey ?? null;
    }

    // Add restore functionality
    async function restoreWallet(mnemonic: string, password: string): Promise<boolean> {
        update(state => ({ ...state, isLoading: true, error: null }));

        try {
            // Validate mnemonic
            if (!validateMnemonic(mnemonic)) {
                throw new Error('Invalid recovery phrase');
            }

            // Clear any existing wallet data
            clearWalletData();

            // Initialize new wallet with the provided mnemonic
            const success = await initializeWallet(password, mnemonic);
            if (!success) {
                throw new Error('Failed to restore wallet');
            }

            // Get current state to access encryptionKey
            const currentState = get(walletStore);

            // After successful restore, scan for UTXOs
            const result = await retrieveWalletData(currentState?.encryptionKey!);
            if (result?.bitcoinData.descriptors) {
                await scanWalletUtxos(result.bitcoinData.descriptors);
            }

            update(state => ({
                ...state,
                isLoading: false,
                error: null,
                failedAttempts: 0
            }));

            return true;
        } catch (error) {
            console.log("restoreWallet error: ", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            update(state => ({
                ...state,
                isLoading: false,
                error: errorMessage
            }));
            return false;
        }
    }

    // Add method to handle scanning
    async function scanWalletUtxos(descriptors: BitcoinDescriptor[]): Promise<boolean> {
        update(state => ({ ...state, isScanning: true, scanProgress: undefined }));

        try {
            // Start the scan
            const scanDescriptors = descriptors.flatMap(desc => [
                desc.receiveDescriptor,
                desc.changeDescriptor
            ]);

            const startResult = await gRpcClient.scantxoutset(
                DEFAULT_WALLET_NAME,
                'start',
                scanDescriptors
            );
            console.log("scanWalletUtxos startResult: ", startResult);
            if (startResult.error) {
                throw new Error(startResult.error);
            }

            // Poll for progress
            while (true) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

                const status = await gRpcClient.scantxoutset(
                    DEFAULT_WALLET_NAME,
                    'status'
                );
                console.log("scanWalletUtxos status: ", status);
                // if status is null, then the scan is complete
                if (status === null) {
                    break;
                }
                if (status.error) {
                    throw new Error(status.error);
                }

                if (status.progress) {
                    update(state => ({ ...state, scanProgress: status.progress }));
                    if (status.progress.progress === 1) {
                        break;
                    }
                }

                if (status.success === true) {
                    break;
                }
            }

            update(state => ({ ...state, isScanning: false, scanProgress: undefined }));
            return true;
        } catch (error) {
            console.error('scanWalletUtxos error:', error);
            update(state => ({
                ...state,
                isScanning: false,
                scanProgress: undefined,
                error: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            }));
            return false;
        }
    }

    return {
        subscribe,
        initializeWallet,
        unlockWallet,
        lockWallet,
        resetWallet,
        getEthPrivateKey,
        restoreWallet,
        confirmMnemonic: () => update(state => ({ ...state, showMnemonic: false, mnemonic: undefined })),
        scanWalletUtxos
    };
}

export const walletStore = createWalletStore();

// Derived stores
export const walletId = derived(walletStore, $wallet => $wallet.walletData?.walletId || null);
export const ethAddress = derived(walletStore, $wallet => $wallet.walletData?.ethAddress || null);
export const ethPrivateKey = derived(walletStore, $wallet => $wallet.walletData?.ethPrivateKey || null);
export const bitcoinDescriptors = derived(walletStore, $wallet => $wallet.bitcoinData?.descriptors || []);
export const isWalletReady = derived(walletStore, $wallet => 
    $wallet.isInitialized && !$wallet.isLocked && !$wallet.isLoading && 
    $wallet.walletData !== null && $wallet.bitcoinData !== null
);