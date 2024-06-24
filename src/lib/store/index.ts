import { listen as gListen } from '@tauri-apps/api/event';
import type { IBlockchainInfo, IWalletInfo } from '$lib/types';
import { ensureBitbidIsRunning, sleep } from '$lib/utils';
import { ensureLoadWallet, getBlockchainInfo, getWalletInfo } from '$lib/wallet-utils';
import { derived, writable } from 'svelte/store';
import { CodeError } from '$lib/error';

// wallet sections

export const errStore = writable(null as CodeError | null);
export const loadedWalletsStore = writable([]); // list of wallet names
// the curWalletStore must be one of the loadedWallets
export const curWalletStore = writable("default");

export const nodeCaughtUpStore = writable(false);

let walletName = "";
export const curWalletInfoStore = derived([curWalletStore, nodeCaughtUpStore], ([$curWallet, $nodeCaughtUpStore], set) => {
    walletName = $curWallet;
    console.log("derived curWalletInfo nodeCaughtUpStore ", $curWallet, $nodeCaughtUpStore)
    if (!$curWallet || !$nodeCaughtUpStore) {
        return;
    }
    ensureLoadWallet($curWallet);
    const interval = setInterval(() => {
        getWalletInfo($curWallet).then(set);
    }, 30 * 1000);
    return () => clearInterval(interval);
}, {} as IWalletInfo)


// node sections

// current blockchain info
export const curBcInfo = writable({ initialblockdownload: true } as IBlockchainInfo);

let gNodeLoopCancelled = false;
async function nodeLoop() {
    let count = 0;
    for (; !gNodeLoopCancelled; await sleep(10 * 1000)) {
        try {
            if (count % 10 == 0) {
                await ensureBitbidIsRunning();
                await sleep(2000);
            }
            const bcInfo = await getBlockchainInfo();
            curBcInfo.set(bcInfo);
            // if we have caught up with the blockchain, we update the wallet info
            if (walletName && !bcInfo.initialblockdownload && bcInfo.headers === bcInfo.blocks) {
                nodeCaughtUpStore.set(true);
            } else {
                nodeCaughtUpStore.set(false);
            }
        } catch (e) {
            console.error("nodeLoop", e);
            if (e instanceof CodeError) {
                errStore.set(e);
                break;
            }
        }
    }
}

nodeLoop();

gListen('tauri://close-requested', () => {
    // The user is trying to close the window
    gNodeLoopCancelled = true;
});