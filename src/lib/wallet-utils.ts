import {gRpcClient} from "./bitbi-rpc/index";
import type { AddrType, DescriptorType, IAddressInfo, IBlockchainInfo, ITransaction, IWalletInfo, TransactionCategory } from "./types";
import { generateRandomBytes, uint8ArrayToHex } from "./utils";
import * as secp256k1 from '@noble/secp256k1';
import { bech32 } from 'bech32'; // Add this line
import bs58check from 'bs58check';
import { ripemd160 as hashRipemd160 } from 'hash.js';
import ecc from '@bitcoinerlab/secp256k1';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes, bytesToHex } from 'ethereum-cryptography/utils';

import { BIP32Factory } from 'bip32';
const BIP32 = BIP32Factory(ecc);

// Simple ECPair implementation
interface ECPair {
    privateKey: Uint8Array;
    publicKey: Uint8Array;
}

function createECPair(privateKey: Uint8Array): ECPair {
    const publicKey = secp256k1.getPublicKey(privateKey, true);
    return { privateKey, publicKey };
}


export const MinerDefaultWallet = "default";
export const MinerReceiveAddrLabel = "miner";
const gCli = gRpcClient;

export async function listWallets() {
    const info = await gCli.listWallets()
    console.log("listWallets info:", info);
    return info;
}

export async function loadWallet(name: string) {
    return await gCli.loadWallet(name);
}

export async function backupWallet(name: string, path: string) {
    return await gCli.backupWallet(name, path);
}

export async function restoreWallet(name: string, path: string, load_on_startup = true) {
    return await gCli.restoreWallet(name, path, load_on_startup);
}

export async function listWalletDir() {
    return await gCli.listWalletDir();
}

export async function ensureLoadWallet(name: string) {
    try {
        const succ = await loadWallet(name);
        if (succ) {
            return;
        }
    } catch (e) {
        console.error('load wallet failed', e);
    }
    try {
        //try to create wallet then load it again
        await gCli.createWallet(name);
        await loadWallet(name);
    } catch (e) {
        console.error('createWallet failed', e);
    }
}

export async function getMinerAddresses(wallet: string, n: number) {
    try {
        let addrs = await gCli.getAddressesByLabel(wallet, MinerReceiveAddrLabel);
        console.log("getMinerAddresses address:", addrs, " of wallet:", wallet);
        if (!addrs) {
            addrs = []
        }
        while (addrs.length < n) {
            const newaddr = await gCli.getNewAddress(wallet, MinerReceiveAddrLabel);
            console.log("new address:", newaddr);
            addrs.push(newaddr);
        }
        return addrs;
    } catch (e) {
        console.error(`wallet[${wallet}]getMinerAddresses`, e)
        return [];
    }
}

export async function getAddressesByLabel(wallet: string, label: string) {
    return await gCli.getAddressesByLabel(wallet, label);
}

export async function getWalletInfo(name: string): Promise<IWalletInfo> {
    const info = await gCli.getWalletInfo(name);
    console.log("wallet info:", info);
    if (!info) {
        return info;
    }
    const walletInfo: IWalletInfo = {
        balance: info.balance,
        immature_balance: info.immature_balance,
        unconfirmed_balance: info.unconfirmed_balance,
        descriptor: info.descriptors,
        walletname: info.walletname,
        lastBlock: info.lastprocessedblock.hash,
        height: info.lastprocessedblock.height
    }
    return walletInfo;
}

export async function getBlockchainInfo():Promise<IBlockchainInfo> {
    const info = await gCli.getBlockchainInfo();
    return info;
}

export async function listLabels(wallet: string): Promise<string[]> {
    return await gCli.listLabels(wallet);
}

export async function getAddressInfo(wallet: string, addr: string) {
    const addrInfo = await gCli.getAddressInfo(wallet, addr);
    console.log("address info:", addrInfo);
    addrInfo.type = determineAddrTypeFromAddressInfo(addrInfo);
    return addrInfo;
}

export async function getNewAddress(wallet: string, label: string, addrType: AddrType) {
    return await gCli.getNewAddress(wallet, label, addrType);
}

function determineAddrTypeFromAddressInfo(addrInfo: IAddressInfo): AddrType {
    if (addrInfo.iswitness) {
        if (addrInfo.witness_version >= 1) {
            return 'bech32m';
        } else {
            return 'bech32';
        }
    } else if (addrInfo.isscript) {
        return 'p2sh-segwit';
    } else {
        return 'legacy';
    }
}

export async function sendToAddress(wallet: string, addr: string, amount: number, comment: string, feeRate: number) {
    return await gCli.sendToAddress(wallet, addr, amount, comment, feeRate);
}

export async function listTransactions(wallet: string, label: string, count: number, skip: number): Promise<ITransaction[]> {
    return await gCli.listTransactions(wallet, label, count, skip, true);
}

export async function listRecentTransactions(wallet: string, count: number, category: TransactionCategory = '*'): Promise<ITransaction[]> {
    let sents: ITransaction[] = [];
    let skip = 0;
    const FarMostAgo = 30 * 24 * 3600;//30 days
    const batchSize = 1000;
    for (; sents.length < count;) {
        let tx = await listTransactions(wallet, "*", batchSize, skip);
        if (tx.length > 0) {
            tx = tx.sort((a, b) => b.time - a.time);
            const fsent = tx.filter(t => t.category === category || category === '*');
            sents = sents.concat(fsent);
            skip += batchSize;
            //check if the last tx is too old
            if (tx.length > 0 && Date.now() - tx[tx.length - 1].time * 1000 > FarMostAgo * 1000) {
                console.log("listTransactions last tx is too old, break");
                break;
            }
        } else {
            console.log("listTransactions no more tx, break");
            break;
        }
    }
    return Array.from(new Set(sents.map(tx => tx.txid)))
                .map(txid => sents.find(tx => tx.txid === txid) as ITransaction);
}


async function generatePrivateDescriptor(derivationPath: string) {
    const privKey = generateRandomBytes(32);
    const keyPair = createECPair(privKey);
    const publicKey = keyPair.publicKey;

    // Create a fingerprint (first 4 bytes of the key hash)
    // const identifier = await hash160(publicKey);
    // const fingerprint = uint8ArrayToHex(identifier.slice(0, 4));

    // Convert private key to WIF format
    const wif = await toWIF(privKey);

    // Use mainnet derivation path
    // const derivationPath = "84'/0'/0'/0/0";

    // Create the private descriptor
    const privateDescriptor = `wpkh(${wif}/${derivationPath})`;
    console.log("privateDescriptor:", privateDescriptor);

    // Create a P2WPKH (native SegWit) address
    const p2wpkhAddress = await createP2WPKHAddress(publicKey);
    console.log("p2wpkh address:", p2wpkhAddress);

    return privateDescriptor;
}

// Helper functions

async function sha256(data: Uint8Array): Promise<Uint8Array> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
}

async function ripemd160(data: Uint8Array): Promise<Uint8Array> {
    const hash = hashRipemd160().update(data).digest();
    return new Uint8Array(hash);
}

async function hash160(buffer: Uint8Array): Promise<Uint8Array> {
    const sha256Hash = await sha256(buffer);
    return await ripemd160(sha256Hash);
}

async function createP2WPKHAddress(publicKey: Uint8Array): Promise<string> {
    const pubKeyHash = await hash160(publicKey);
    const words = bech32.toWords(pubKeyHash);
    return bech32.encode('bc', words, 'bech32');
}

async function toWIF(privateKey: Uint8Array): Promise<string> {
    const version = 0x80; // Mainnet private key version
    const extendedKey = new Uint8Array([version, ...privateKey, 0x01]); // 0x01 for compressed public key
    return bs58check.encode(extendedKey);
}


async function generatePrivateDescriptor2(derivationPath: string) {
    // Generate a random 32-byte seed
    const seed = generateRandomBytes(32);
    // Create a master key from the seed
    const root = BIP32.fromSeed(seed);
    // Get the xprv
    const xprv = root.toBase58();
    
    // Create the private descriptor
    const privateDescriptor = `wpkh(${xprv}/${derivationPath})`;
    console.log("privateDescriptor:", privateDescriptor);
    
    return privateDescriptor;
}


function hasSpecificDerivationPath(descriptor: string, targetPath: string) {
    // Regular expression to match the derivation path within wpkh()
    const descriptorRegex = /wpkh\((xprv|xpub)[\w]+\/(.+?)\)/;
    const pathRegex = /(\d+)(['hH]?)/g;
  
    // Extract the derivation path from the descriptor
    const match = descriptor.match(descriptorRegex);
    if (!match) return false;
  
    const descriptorPath = match[2];
  
    // Parse the descriptor path
    const descriptorSteps = [];
    let step;
    while ((step = pathRegex.exec(descriptorPath)) !== null) {
      descriptorSteps.push(`${step[1]}${step[2].toLowerCase()}`);
    }
  
    // Parse the target path
    const targetSteps = targetPath.split('/').filter(s => s !== '');
  
    // Compare the paths
    if (descriptorSteps.length !== targetSteps.length) return false;
  
    for (let i = 0; i < descriptorSteps.length; i++) {
      if (descriptorSteps[i] !== targetSteps[i]) return false;
    }
  
    return true;
  }
  
function findDescriptorByDerivationPath(descriptors: DescriptorType[], derivationPath: string) {
    // sort descriptors by timestamp time, the first one is the oldest
    const sortedDescriptors = descriptors.sort((a, b) => a.timestamp - b.timestamp);
    console.log("sortedDescriptors:", sortedDescriptors);
    return sortedDescriptors.find(d => {
        const desc = d.desc;
        // how to check if desc is a derivation path of derivationPath
        return hasSpecificDerivationPath(desc, derivationPath);
    });
}

async function generateEthPrivateKeyFromXprvKey(key: string) {
    let privateKey: Uint8Array;

    if (key.startsWith('xprv')) {
        // Handle xprv key
        const node = BIP32.fromBase58(key);
        privateKey = node.privateKey!;
    } else if (key.startsWith('xpub')) {
        // Handle xpub key (note: this won't give us a private key)
        throw new Error("Cannot generate wallet ID from xpub key");
    } else {
        // Assume it's a WIF private key
        privateKey = bs58check.decode(key).slice(1, 33);
    }

    // Hash the private key to get a 32-byte value
    return await sha256(privateKey);
}

async function getEthAddressFromPrivateKey(privateKey: Uint8Array) {
    const publicKey = secp256k1.getPublicKey(privateKey, false).slice(1); // We want the uncompressed public key without the prefix
    const address = keccak256(publicKey).slice(-20);
    return '0x' + bytesToHex(address);
}

async function generateEthAddressFromXprvKey(key: string) {
    const privateKey = await generateEthPrivateKeyFromXprvKey(key);
    const ethAddress = await getEthAddressFromPrivateKey(privateKey);
    // encode ethAddress to base58
    const base58Address = bs58check.encode(hexToBytes(ethAddress));
    // Return the address with the '0x' prefix
    return {privateKey: "0x" + bytesToHex(privateKey), ethAddress: ethAddress, walletId: "w" + base58Address};
}


const WalletIdMagicalDerivationPath = "5h/20h/8h/5h/18h/5h/21h/12h/44h/60h/0h/0";

async function generateWalletIdInfo(wallet: string) {
    const descriptors = await gCli.listDescriptors(wallet, true);
    let desc = findDescriptorByDerivationPath(descriptors, WalletIdMagicalDerivationPath);
    console.log("found? desc:", desc);
    if (!desc) {
        const privateDescriptor = await generatePrivateDescriptor2(WalletIdMagicalDerivationPath);
        const  descInfo = await gCli.getDescriptorInfo(wallet, privateDescriptor);
        const checksum = descInfo.checksum;
        const descriptor = `${privateDescriptor}#${checksum}`;
        try {
            desc = {
                desc: descriptor,
                timestamp: Math.floor(Date.now()/1000),
                active: false,
                internal: false,
            }
            console.log("descriptor to import:", desc)
            const result = await gCli.importDescriptors(wallet, [desc]);
            console.log("importDescriptors result:", result);
        } catch (e) {
            console.error("importDescriptors failed", e);
            throw e;
        }
    }   
    // get the key of the descriptor
    const key = desc.desc.split("(")[1].split("/")[0];
    return await generateEthAddressFromXprvKey(key);
}

const LSID_WalletId = "wallet:id";
const LSID_EthAddr = "wallet:ethaddr";
export async function getWalletIdAndEthAddr(walletname: string) {
    try {
        const walletId = localStorage.getItem(LSID_WalletId)
        const ethAddr = localStorage.getItem(LSID_EthAddr)
        if (walletId) {
            return {walletId, ethAddr};
        }
        const descInfo = await generateWalletIdInfo(walletname)
        localStorage.setItem(LSID_WalletId, descInfo.walletId)
        localStorage.setItem(LSID_EthAddr, descInfo.ethAddress)
        return {walletId:descInfo.walletId, ethAddr:descInfo.ethAddress};
    }catch(e) {
        console.error("getWalletIdAndEthAddr:", e)
        throw e;
    }
}

export async function getWalletEthPrvKey(walletname: string) {
    const descInfo = await generateWalletIdInfo(walletname)
    return descInfo.privateKey;
}

