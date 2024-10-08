import { gRpcClient } from "./bitbi-rpc/index";
import type { IListUnspentResponse } from "./types";
import { stringToHex } from "./utils";
import Web3 from 'web3';
import {  BRIDGE_SERVER_URL } from "./config";
import { getWalletIdAndEthAddr } from "./wallet-utils";

export async function createSignedBtbTransaction(walletName: string, toAddress: string, returnEthAddress: string, amountBtb: number) {
    try {
        // Convert BTB to satoshis (1 BTB = 100,000,000 satoshis)
        const amountSatoshis = BigInt(Math.round(amountBtb * 100_000_000));
        const feeSatoshis = BigInt(10_000); // 0.0001 BTB in satoshis

        // Get and sort unspent transactions
        let unspent;
        try {
            unspent = await gRpcClient.listUnspent(walletName, {
                minconf: 0,
                maxconf: 9999999,
                addresses: [],
                include_unsafe: false,
                query_options: {
                    minimumAmount: 0.0001,
                    maximumAmount: 999999999,
                    minimumSumAmount: Number(amountSatoshis + feeSatoshis) / 100_000_000,
                    include_immature_coinbase: false
                }
            });
            console.log("Unspent transactions:", JSON.stringify(unspent, null, 2));
        } catch (error) {
            console.error("Error fetching unspent transactions:", error);
            throw error;
        }
        unspent.sort((a: IListUnspentResponse, b: IListUnspentResponse) => b.amount - a.amount);

        let totalSatoshis = BigInt(0);
        const inputs = [];

        // Select inputs
        for (const utxo of unspent) {
            if (totalSatoshis >= amountSatoshis + feeSatoshis) break;
            inputs.push({ txid: utxo.txid, vout: utxo.vout });
            totalSatoshis += BigInt(Math.round(utxo.amount * 100_000_000));
        }

        // Check for insufficient funds
        if (totalSatoshis < amountSatoshis + feeSatoshis) {
            console.log(`Insufficient funds. Available: ${totalSatoshis}, Required: ${amountSatoshis + feeSatoshis}`);
            return null;
        }

        // Get change address
        const changeAddress = await gRpcClient.getRawChangeAddress(walletName, "bech32");
        console.log("changeAddress:", changeAddress)
        const {walletId} = await getWalletIdAndEthAddr(walletName);
        // Add OP_RETURN data
        // remove 0x prefix of returnEthAddress if it exists
        const opReturnData = `wrp:${walletId}-${returnEthAddress.startsWith('0x') ? returnEthAddress.slice(2) : returnEthAddress}`;
        console.log("opReturnData:", opReturnData);
        // Prepare outputs
        const outputs = [
            {[toAddress]: Number(amountSatoshis) / 100_000_000},
            {[changeAddress]: Number(totalSatoshis - amountSatoshis - feeSatoshis) / 100_000_000},
            {data: stringToHex(opReturnData)},
        ];
        console.log(`Wallet Name: ${walletName}`);
        console.log(`Inputs:`, inputs);
        console.log(`Outputs:`, outputs);
        // Create and sign raw transaction
        let rawTx;
        try {
            rawTx = await gRpcClient.createRawTransaction(walletName, inputs, outputs);
            console.log("Raw Transaction:", rawTx);
        } catch (error) {
            console.error("Error creating raw transaction:", error);
            throw error;
        }
        let signedTx;
        try {
            signedTx = await gRpcClient.signRawTransactionWithWallet(walletName, rawTx);
            console.log("Signed Transaction:", JSON.stringify(signedTx, null, 2));
        } catch (error) {
            console.error("Error signing raw transaction:", error);
            throw error;
        }
        if (signedTx.complete) {
            return signedTx.hex;
        } else {
            console.log("Failed to sign the transaction");
            return null;
        }
    } catch (error) {
        console.error(`An error occurred in createSignedBtbTransaction: ${error}`);
        return null;
    }
}



const MaxGasPriceWei = BigInt(400 * 10**9); // 400 Gwei

async function getUnwrapEthTransactionCount(address: string): Promise<{final_nonce: number | null, chainId: number | null}> {
    try {
        const response = await fetch(`${BRIDGE_SERVER_URL}/unwrap-eth-transaction-count/${address}`);
        if (response.ok) {
            const data = await response.json();
            return {final_nonce: data.final_nonce, chainId: data.chain_id};
        } else {
            console.error(`Failed to get transaction count. Status code: ${response.status}`);
            console.error(`Response content: ${await response.text()}`);
            return {final_nonce: null, chainId: null};
        }
    } catch (error) {
        console.error(`An error occurred while getting transaction count: ${error}`);
        return {final_nonce: null, chainId: null};
    }
}


export async function createSignedEthTransaction(walletName: string, wbtbAmount: number, btbReceivingAddress: string, privateKey: string, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contractAbi: any, contractAddress: string, gasPriceWei?: string, gasLimit?: number) {
    try {
        const web3 = new Web3();
        console.log("gasPricewei:", gasPriceWei)
        console.log("privateKey:", privateKey)
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);

        const senderAddress = account.address;
        console.log("Sender Address:", senderAddress);
        const {final_nonce: nonce, chainId: chainId} = await getUnwrapEthTransactionCount(senderAddress);
        console.log("Nonce:", nonce);
        console.log("Chain ID:", chainId);

        if (nonce === null || chainId === null) {
            console.error("Failed to get transaction count from server. Aborting transaction.");
            return null;
        }

        console.log("nonce:", nonce);

        const satoshis = BigInt(Math.round(wbtbAmount * 100000000)); // 1 BTB = 100,000,000 satoshis
        console.log("satoshis:", satoshis.toString());
        const {walletId} = await getWalletIdAndEthAddr(walletName);
        // Prepare the custom data
        const customData = web3.utils.asciiToHex(`unw:${walletId}-${btbReceivingAddress}`);
        console.log("custom_data:", customData);

        // Create the contract instance
        const wbtbContract = new web3.eth.Contract(contractAbi, contractAddress);

        // Prepare the burn function call
        const burnFunction = wbtbContract.methods.burn(satoshis, customData);

        // Convert MaxGasPrice to Wei if it's not already

        // Convert provided gas price from Gwei to Wei, or use MaxGasPriceWei
        const providedGasPriceWei = gasPriceWei ? BigInt(gasPriceWei) : MaxGasPriceWei;
        const finalGasPriceWei = (providedGasPriceWei < MaxGasPriceWei ? providedGasPriceWei : MaxGasPriceWei);
        
        console.log("gas_price (Wei):", finalGasPriceWei.toString());
        console.log("gas_price (Gwei):", (finalGasPriceWei / BigInt(10**9)).toString());

        // Prepare transaction data
        const transaction = {
            from: senderAddress,
            to: contractAddress,
            data: burnFunction.encodeABI(),
            gas: gasLimit,
            gasPrice: finalGasPriceWei.toString(),
            nonce: nonce,
            chainId: chainId
        };
        console.log("sendingtransaction:", transaction);
        // Sign the transaction
        const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
        console.log("signedTx:", signedTx);
        return signedTx.rawTransaction;
    } catch (error) {
        console.error(`An error occurred: ${error}`);
        return null;
    }
}



