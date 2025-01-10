import { gRpcClient, type RPCError } from './bitbi-rpc';
import type { BitcoinDescriptor } from './bitcoin-utils';
import { DEFAULT_WALLET_NAME } from './config';
import type { ImportDescriptorItem, ScanProgress } from './types';

export class WalletManager {
    private static readonly WALLET_NAME = DEFAULT_WALLET_NAME;

    static async initializeWallet(): Promise<boolean> {
        try {
            // Check if wallet exists
            const wallets = await gRpcClient.listWalletDir();
            
            if (wallets.includes(this.WALLET_NAME)) {
                // Wallet exists, load it
                await gRpcClient.loadWallet(this.WALLET_NAME);
            } else {
                // Create new blank wallet with private keys enabled
                await gRpcClient.createWallet(this.WALLET_NAME, true, true);
            }
            
            return true;
        } catch (error) {
            if ((error as RPCError).message.includes("already loaded")) {
                console.log("already-loaded:", this.WALLET_NAME);
                return true;
            }
            console.error('Failed to initialize wallet:', error);
            return false;
        }
    }

    static async isWalletScanning(): Promise<{ 
        scanning: boolean; 
        progress?: ScanProgress;
        blockchainInfo?: {
            initialBlockDownload: boolean;
            progress: number;
            blocks: number;
            headers: number;
        };
    }> {
        try {
            const [scanningInfo, bcInfo] = await Promise.all([
                gRpcClient.getWalletInfo(this.WALLET_NAME),
                gRpcClient.getBlockchainInfo()
            ]);

            return {
                scanning: scanningInfo.scanning?.duration > 0,
                progress: scanningInfo.scanning,
                blockchainInfo: {
                    initialBlockDownload: bcInfo.initialblockdownload,
                    progress: bcInfo.verificationprogress,
                    blocks: bcInfo.blocks,
                    headers: bcInfo.headers
                }
            };
        } catch (error) {
            console.error('Failed to check wallet scanning status:', error);
            return { scanning: false };
        }
    }

    static async waitForScanComplete(
        onProgress?: (progress: ScanProgress, blockchainInfo?: { 
            initialBlockDownload: boolean;
            progress: number;
            blocks: number;
            headers: number;
        }) => void,
        checkInterval = 2000,
        maxWaitTime = 30000 // Maximum time to wait if blockchain is syncing
    ): Promise<boolean> {
        const startTime = Date.now();
        
        while (true) {
            const { scanning, progress, blockchainInfo } = await this.isWalletScanning();
            
            // If blockchain is syncing and we've waited long enough, proceed anyway
            const timeElapsed = Date.now() - startTime;
            if (blockchainInfo?.initialBlockDownload && timeElapsed > maxWaitTime) {
                console.log("Blockchain still syncing, proceeding after timeout");
                return true;
            }
            
            // If not scanning and blockchain is synced, we're done
            if (!scanning && !blockchainInfo?.initialBlockDownload) {
                return true;
            }

            if (progress && onProgress) {
                onProgress(progress, blockchainInfo);
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
    }

    static async getDescriptorChecksum(descriptor: string): Promise<string> {
        try {
            const info = await gRpcClient.getDescriptorInfo(this.WALLET_NAME, descriptor);
            return '#' + info.checksum;
        } catch (error) {
            console.error('Failed to get descriptor checksum:', error);
            throw error;
        }
    }

    static async importDescriptorsWithScanCheck(
        descriptors: BitcoinDescriptor[],
        onScanProgress?: (progress: ScanProgress, blockchainInfo?: {
            initialBlockDownload: boolean;
            progress: number;
            blocks: number;
            headers: number;
        }) => void,
        maxRetries = 3,
        initialDelay = 2000
    ): Promise<boolean> {
        let attempt = 0;
        let progressMonitorInterval: NodeJS.Timeout | null = null;

        // Start monitoring progress in the background
        if (onScanProgress) {
            progressMonitorInterval = setInterval(async () => {
                const { scanning, progress, blockchainInfo } = await this.isWalletScanning();
                if (scanning && progress) {
                    onScanProgress(progress, blockchainInfo);
                }
            }, 2000);
        }

        try {
            while (true) { // Keep trying until success or max retries on actual import attempts
                try {
                    // Check if wallet is currently scanning
                    const { scanning, progress, blockchainInfo } = await this.isWalletScanning();
                    
                    if (scanning) {
                        // If scanning, just wait without counting as a retry
                        console.log("Wallet is scanning, waiting for completion...");
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        continue; // Continue without incrementing attempt counter
                    }
                    
                    // Import descriptors when not scanning
                    const result = await this.importDescriptors(descriptors);
                    console.log("importDescriptorsWithScanCheck result:", result);
                    
                    if (result) {
                        // If blockchain is syncing, notify user that scanning will continue
                        if (blockchainInfo?.initialBlockDownload && onScanProgress) {
                            onScanProgress(
                                { progress: 0 }, // Reset progress for new scan
                                blockchainInfo
                            );
                        }
                        return true;
                    }

                    // Only increment attempt counter when import actually fails (not when scanning)
                    attempt++;
                    if (attempt >= maxRetries) {
                        console.log("Max import attempts reached:", attempt);
                        return false;
                    }
                    
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    console.error(`Import attempt failed:`, errorMessage);
                    
                    // If error is due to active rescan, wait without counting as retry
                    if (errorMessage.includes("Wallet is currently rescanning")) {
                        console.log("Wallet is rescanning, waiting...");
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        continue; // Continue without incrementing attempt counter
                    } else {
                        // For other errors, count as attempt and use exponential backoff
                        attempt++;
                        if (attempt >= maxRetries) {
                            console.log("Max import attempts reached after error:", attempt);
                            return false;
                        }
                        const delay = initialDelay * Math.pow(2, attempt);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }
        } finally {
            // Clean up progress monitor
            if (progressMonitorInterval) {
                clearInterval(progressMonitorInterval);
            }
        }
    }

    static async importDescriptors(descriptors: BitcoinDescriptor[]): Promise<boolean> {
        try {
            console.log("importDescriptors descriptors:", descriptors);
            // First, get existing descriptors
            const existingDescriptors = await gRpcClient.listDescriptors(this.WALLET_NAME, true);
            console.log("existing descriptors:", existingDescriptors);
            // Add checksums to descriptors while keeping private keys
            const importRequestsArray = await Promise.all(descriptors.flatMap(async desc => {
                const receiveChecksum = await this.getDescriptorChecksum(desc.receiveDescriptor);
                const changeChecksum = await this.getDescriptorChecksum(desc.changeDescriptor);
                
                // Check if descriptors are ranged (contain '/*' at the derivation path end)
                const isRanged = desc.receiveDescriptor.includes('/*');
                
                return [
                    {
                        desc: desc.receiveDescriptor + receiveChecksum,
                        active: true,
                        internal: false,
                        timestamp: 1720000000,
                        ...(isRanged && { range: [0, 2000] })
                    },
                    {
                        desc: desc.changeDescriptor + changeChecksum,
                        active: true,
                        internal: true,
                        timestamp: 1720000000,
                        ...(isRanged && { range: [0, 2000] })
                    }
                ];
            }));
            const importRequests = importRequestsArray.flat();
            // Create a set of new descriptor strings for comparison
            const newDescriptorSet = new Set(importRequests.map(desc => desc.desc));

            // Deactivate only descriptors that are not in the new set
            const deactivateRequests = existingDescriptors
                .filter(desc => !newDescriptorSet.has(desc.desc) && desc.active)
                .map(desc => ({
                    desc: desc.desc,
                    active: false,
                    internal: desc.internal,
                    timestamp: 1720000000
                }));

            if (deactivateRequests.length > 0) {
                console.log("Deactivating descriptors:", deactivateRequests);
                console.log("Deactivating newDescriptorSet descriptors:", newDescriptorSet);
                await gRpcClient.importDescriptors(this.WALLET_NAME, deactivateRequests as ImportDescriptorItem[]);
            }

            //filter out the descriptors that are already in the wallet
            const needToImport = importRequests.filter(desc => {
                return !existingDescriptors.find(existing => existing.desc === desc.desc 
                    && existing.active === desc.active 
                    && existing.internal === desc.internal 
                    && existing.timestamp === desc.timestamp);
            });
            console.log("need to import descriptors:", needToImport);
            const result = await gRpcClient.importDescriptors(this.WALLET_NAME, needToImport as ImportDescriptorItem[]);
            console.log("importDescriptors result:", result);
            return true;
        } catch (error) {
            console.error('Failed to import descriptors:', error);
            return false;
        }
    }
} 

