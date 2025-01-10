import { bytesToHex } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import { derivePrivateKey, deriveExtendedKey, WALLET_ID_PATH } from './wallet-key-utils';
import * as secp256k1 from '@noble/secp256k1';

export interface BitcoinDescriptor {
    type: 'P2PKH' | 'P2SH' | 'P2WPKH' | 'P2WSH' | 'P2TR' | 'WALLET_ID';
    path: string;
    receiveDescriptor: string;
    changeDescriptor: string;
    isActive: boolean;
}

export interface BitcoinWalletData {
    descriptors: BitcoinDescriptor[];
    masterFingerprint: string;
}

const DERIVATION_PATHS = {
    P2PKH: "m/44'/0'/0'",      // Legacy
    P2SH: "m/49'/0'/0'",       // Nested SegWit
    P2WPKH: "m/84'/0'/0'",     // Native SegWit
    P2TR: "m/86'/0'/0'",       // Taproot
    // WALLET_ID: WALLET_ID_PATH   // Special path for wallet ID
};

function createDescriptor(type: string, masterFingerprint: string, path: string, xprv: string): BitcoinDescriptor {
    const basePath = path.slice(1); // Remove leading 'm'
    const originInfo = `[${masterFingerprint}${basePath}]`;
    
    let receiveDescriptor = '';
    let changeDescriptor = '';
    
    switch (type) {
        case 'P2PKH':
            receiveDescriptor = `pkh(${originInfo}${xprv}/0/*)`;
            changeDescriptor = `pkh(${originInfo}${xprv}/1/*)`;
            break;
        case 'P2SH':
            // P2WPKH nested in P2SH
            receiveDescriptor = `sh(wpkh(${originInfo}${xprv}/0/*))`;
            changeDescriptor = `sh(wpkh(${originInfo}${xprv}/1/*))`;
            break;
        case 'P2WPKH':
            receiveDescriptor = `wpkh(${originInfo}${xprv}/0/*)`;
            changeDescriptor = `wpkh(${originInfo}${xprv}/1/*)`;
            break;
        case 'P2TR':
            // For Taproot, we use xprv directly
            receiveDescriptor = `tr(${originInfo}${xprv}/0/*)`;
            changeDescriptor = `tr(${originInfo}${xprv}/1/*)`;
            break;
        // case 'WALLET_ID':
        //     // For wallet ID, we use a single P2WPKH address without derivation paths
        //     receiveDescriptor = `wpkh(${originInfo}${xprv})`;
        //     changeDescriptor = receiveDescriptor; // Same as receive for wallet ID
        //     break;
    }

    return {
        type: type as BitcoinDescriptor['type'],
        path,
        receiveDescriptor,
        changeDescriptor,
        isActive: true
    };
}

export function deriveDescriptors(masterPrivateKey: Uint8Array, masterPublicKey: Uint8Array): BitcoinDescriptor[] {
    const masterFingerprint = bytesToHex(sha256(masterPublicKey).slice(0, 4));
    const descriptors: BitcoinDescriptor[] = [];

    Object.entries(DERIVATION_PATHS).forEach(([type, path]) => {
        // Derive extended private key for the path
        const xprv = deriveExtendedKey(masterPrivateKey, path);
        descriptors.push(createDescriptor(type, masterFingerprint, path, xprv));
    });

    return descriptors;
}