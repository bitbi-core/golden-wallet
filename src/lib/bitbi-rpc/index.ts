import type { AddrPurpose, AddrType, DescriptorInfo, DescriptorType, IAddressInfo, IListUnspentResponse, ImportDescriptorItem } from '$lib/types';
import { fetch, Body } from '@tauri-apps/api/http';
type RpcClientOptions = {
    host?: string;
    port?: number;
    user?: string;
    pass?: string;
    protocol?: string;
    disableAgent?: boolean;
    rejectUnauthorized?: boolean;
};

type Logger = {
    info: (message: string) => void;
    warn: (message: string) => void;
    err: (message: string) => void;
    debug: (message: string) => void;
};

interface IListUnspentConfig {
    minconf: number; // 0 Minimum number of confirmations
    maxconf: number; // 9999999 Maximum number of confirmations
    addresses: string[]; // "" Address filter
    include_unsafe: boolean; // false Include unconfirmed UTXOs
    query_options?: {
        minimumAmount?: number; // 0 Minimum value of each UTXO in BTB
        maximumAmount?: number; // unlimited Maximum value of each UTXO in BTB
        maximumCount?: number; // unlimited Maximum number of UTXOs
        minimumSumAmount?: number; // unlimited Minimum sum value of all UTXOs in BTB
        include_immature_coinbase?: boolean; // false Include immature coinbase UTXOs
    };
}

const CALL_SPEC = {
    abandonTransaction: 'str',
    abortRescan: '',
    addMultiSigAddress: '',
    addNode: '',
    analyzePSBT: 'str',
    // backupWallet: '',
    bumpFee: 'str',
    clearBanned: '',
    combinePSBT: 'obj',
    combineRawTransaction: 'obj',
    convertToPSBT: 'str',
    createMultiSig: '',
    createPSBT: 'obj',
    createRawTransaction: 'obj obj',
    //createWallet: 'str',
    decodePSBT: 'str',
    decodeScript: 'str',
    decodeRawTransaction: '',
    deriveAddresses: 'str',
    disconnectNode: '',
    dumpPrivKey: '',
    dumpWallet: 'str',
    encryptWallet: '',
    enumerateSigners: '',
    estimateFee: '', // deprecated
    estimateSmartFee: 'int str',
    estimatePriority: 'int', // deprecated
    generate: 'int', // deprecated
    generateBlock: 'str obj',
    generateToAddress: 'int str',
    generateToDescriptor: 'int str',
    getAccount: '', // deprecated
    getAccountAddress: 'str', // deprecated
    getAddedNodeInfo: '',
    getAddressMempool: 'obj', // deprecated
    getAddressUtxos: 'obj', // deprecated
    getAddressBalance: 'obj', // deprecated
    getAddressDeltas: 'obj', // deprecated
    // getAddressesByLabel: 'str',
    // getAddressInfo: 'str',
    getAddressTxids: 'obj', // deprecated
    getAddressesByAccount: '', // deprecated
    getBalance: 'str int',
    getBalances: '',
    getBestBlockHash: '',
    getBlockDeltas: 'str', // deprecated
    getBlock: 'str int',
    // getBlockchainInfo: '',
    getBlockCount: '',
    getBlockFilter: 'str',
    getBlockHashes: 'int int obj', // deprecated
    getBlockHash: 'int',
    getBlockHeader: 'str',
    getBlockNumber: '', // deprecated
    getBlockStats: 'str',
    getBlockTemplate: '',
    getConnectionCount: '',
    getChainTips: '',
    getChainTxStats: '',
    // getDescriptorInfo: 'str',
    getDifficulty: '',
    getGenerate: '', // deprecated
    getHashesPerSec: '', // deprecated
    getIndexInfo: '',
    getInfo: '', // deprecated
    getMemoryInfo: '',
    getMemoryPool: '', // deprecated
    getMemPoolAncestors: 'str',
    getMemPoolDescendants: 'str',
    getMemPoolEntry: 'str',
    getMemPoolInfo: '',
    getMiningInfo: '',
    getNetTotals: '',
    getNetworkHashPS: '',
    getNetworkInfo: '',
    // getNewAddress: 'str str',
    getNodeAddresses: '',
    getPeerInfo: '',
    // getRawChangeAddress: '',
    getRawMemPool: 'bool',
    getRawTransaction: 'str int',
    getReceivedByAccount: 'str int', // deprecated
    getReceivedByAddress: 'str int',
    getReceivedByLabel: 'str',
    getRpcInfo: '',
    getSpentInfo: 'obj',
    getTransaction: '',
    getTxOut: 'str int bool',
    getTxOutProof: '',
    getTxOutSetInfo: '',
    getUnconfirmedBalance: '',
    // getWalletInfo: '',
    getWork: '',
    getZmqNotifications: '',
    finalizePSBT: 'str',
    fundRawTransaction: 'str',
    help: '',
    importAddress: 'str str bool',
    // importDescriptors: 'str',
    importMulti: 'obj obj',
    importPrivKey: 'str str bool',
    importPrunedFunds: 'str, str',
    importPubKey: 'str',
    importWallet: 'str',
    invalidateBlock: 'str',
    joinPSBTs: 'obj',
    keyPoolRefill: '',
    listAccounts: 'int',
    listAddressGroupings: '',
    listBanned: '',
    // listDescriptors: '',
    // listLabels: '',
    listLockUnspent: 'bool',
    listReceivedByAccount: 'int bool',
    listReceivedByAddress: 'int bool',
    listReceivedByLabel: '',
    listSinceBlock: 'str int',
    // listUnspent: 'int int',
    // listWallets: '',
    // loadWallet: 'str',
    lockUnspent: '',
    logging: '',
    move: 'str str float int str',
    ping: '',
    preciousBlock: 'str',
    prioritiseTransaction: 'str float int',
    pruneBlockChain: 'int',
    psbtBumpFee: 'str',
    removePrunedFunds: 'str',
    reScanBlockChain: '',
    saveMemPool: '',
    send: 'obj',
    setHDSeed: '',
    setLabel: 'str str',
    setWalletFlag: 'str',
    scanTxOutSet: 'str',
    sendFrom: 'str str float int str str',
    sendMany: 'str obj int str',  //not sure this is will work
    sendRawTransaction: 'str',
    // sendToAddress: 'str float str str',
    setAccount: '',
    setBan: 'str str',
    setNetworkActive: 'bool',
    setGenerate: 'bool int',
    setTxFee: 'float',
    signMessage: '',
    signMessageWithPrivKey: 'str str',
    signRawTransaction: '',
    signRawTransactionWithKey: 'str obj',
    signRawTransactionWithWallet: 'str',
    stop: '',
    submitBlock: 'str',
    submitHeader: 'str',
    testMemPoolAccept: 'obj',
    unloadWallet: '',
    upgradeWallet: '',
    uptime: '',
    utxoUpdatePSBT: 'str',
    validateAddress: '',
    verifyChain: '',
    verifyMessage: '',
    verifyTxOutProof: 'str',
    walletCreateFundedPSBT: '',
    walletDisplayAddress: 'str',
    walletLock: '',
    walletPassPhrase: 'string int',
    walletPassphraseChange: '',
    walletProcessPSBT: 'str'
};


class RpcClient {
    static loggers: { [key: string]: Logger } = {
        none: { info: () => { }, warn: () => { }, err: () => { }, debug: () => { } },
        normal: { info: console.log, warn: console.log, err: console.log, debug: () => { } },
        debug: { info: console.log, warn: console.log, err: console.log, debug: console.log },
    };

    static config = {
        logger: 'normal', // none, normal, debug
    };

    host: string;
    port: number;
    user: string;
    pass: string;
    protocol: string;
    batchedCalls: unknown;
    disableAgent: boolean;
    rejectUnauthorized: boolean;
    log: Logger;
    httpOptions: unknown;

    constructor(opts: RpcClientOptions | string) {
        if (typeof opts === 'string') {
            opts = decodeURL(opts);
        }
        opts = opts || {};
        this.host = opts.host || '127.0.0.1';
        this.port = opts.port || 8332;
        this.user = opts.user || 'user';
        this.pass = opts.pass || 'pass';
        this.protocol = opts.protocol === 'http' ? 'http' : 'https';
        this.batchedCalls = null;
        this.disableAgent = opts.disableAgent || false;

        this.rejectUnauthorized = !!opts.rejectUnauthorized


        this.log = RpcClient.loggers[RpcClient.config.logger || 'normal'];
    }

    async rpc(request: any, path = ""): Promise<any> {
        const userInfo = `${this.user}:${this.pass}`;
        const auth = btoa(userInfo);
        console.log(`rpc request`, userInfo);
        console.log(`rpc request`, request);
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: Body.json(request),
        };

        const url = `${this.protocol}://${this.host}:${this.port}/${path}`;
        // [Log] rpc fetch options – {method: "POST", headers: {Content-Type: "application/json", Authorization: "Basic Z29sZGVuOndhbGxldA=="}, body: "{\"method\":\"getblockchaininfo\",\"params\":[],\"id\":46363}"} (index.ts, line 252)
        try {
            console.log(`rpc fetch url`, url);
            console.log(`rpc fetch options`, options)
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
                body: Body.json(request),
            });
            console.log(`rpc fetch response`, response)
            const data = response.data;
            console.log(`rpc fetch response.data`, data)
            const reqBody = JSON.stringify(request);
            if (response.status === 401) {
                throw new Error('Bitcoin JSON-RPC: Connection Rejected: 401 Unnauthorized:' + reqBody);
            }
            if (response.status === 403) {
                throw new Error('Bitcoin JSON-RPC: Connection Rejected: 403 Forbidden:' + reqBody);
            }
            if (response.status === 404) {
                throw new Error('Bitcoin JSON-RPC: Connection Rejected: 404 Not Found:' + reqBody);
            }
            if (response.status === 500 && data === 'Work queue depth exceeded') {
                const exceededError = new Error('Bitcoin JSON-RPC: ' + data);
                exceededError['code'] = 429; // Too many requests
                throw exceededError;
            }
            if (response.status === 500 && data.error) {
                const err = new Error(data.error.message + ":" + reqBody);
                err['code'] = data.error.code;
                throw err;
            }

            return data.result;
        } catch (error: any) {
            this.log.info(error);
            this.log.err(error.stack);
            this.log.err('HTTP Status code:' + error.status);
            throw new Error('Bitcoin JSON-RPC: Request Error: ' + error.message);
        }
    }
    
    async getNewAddress(wallet: string, label?: string, address_type?: AddrType): Promise<string> {
        const params: string[] = [];
        if (label) {
            params.push(label);
        }
        if (address_type) {
            params.push(address_type);
        }
        return await this.rpc({
            method: 'getnewaddress',
            params: params,
            id: getRandomId()
        }, `wallet/${wallet}`);
    }

    async getAddressesByLabel(wallet: string, label: string) {
        try {
            const addrs = await this.rpc({
                method: 'getaddressesbylabel',
                params: [label],
                id: getRandomId()
            }, `wallet/${wallet}`);
            if (!addrs) {
                return null;
            }
            return Object.keys(addrs);
        } catch (e) {
            console.log("getAddressesByLabel error:", e.code, "=", e.message);
            return null;
        }
    }

    async listWallets() {
        return await this.rpc({
            method: 'listwallets',
            params: [],
            id: getRandomId()
        });
    }

    async loadWallet(name: string) {
        try {
            await this.rpc({
                method: 'loadwallet',
                params: [name],
                id: getRandomId()
            });
            return true;
        } catch (e) {
            console.log("loadWallet error:", e.code, "=", e.message)
            if (e.message.includes("already loaded")) {
                //This same wallet is already loaded
                console.log("already-loaded true");
                return true;
            }
            throw e;
        }
    }

    async backupWallet(name: string, destFile: string) {
        console.log("backupWallet", name, destFile)
        return await this.rpc({
            method: 'backupwallet',
            params: [destFile],
            id: getRandomId()
        }, `wallet/${name}`);
    }

    async restoreWallet(newName: string, srcFile: string, load_on_startup: boolean | null = null) {
        console.log("restoreWallet", newName, srcFile)
        return await this.rpc({
            method: 'restorewallet',
            params: [newName, srcFile, load_on_startup],
            id: getRandomId()
        });
    }

    async createWallet(name: string) {
        return await this.rpc({
            method: 'createwallet',
            params: [name],
            id: getRandomId()
        });
    }

    async getWalletInfo(wallet: string) {
        return await this.rpc({
            method: 'getwalletinfo',
            params: [],
            id: getRandomId()
        }, `wallet/${wallet}`);
    }

    async listWalletDir(): Promise<string[]> {
        try {
            const info = await this.rpc({
                method: 'listwalletdir',
                params: [],
                id: getRandomId()
            });
            console.log("listWalletDir info ", info)
            let wallets = [] as string[];
            if (info?.wallets instanceof Array) {
                wallets = info.wallets.map((w: any) => w.name);
            }
            console.log("listWalletDir: ", wallets)
            return wallets
        } catch (e) {
            console.log("listWalletDir error:", e)
            return []
        }
    }

    async getBlockchainInfo() {
        return await this.rpc({
            method: 'getblockchaininfo',
            params: [],
            id: getRandomId()
        });
    }


    async listLabels(wallet: string, purpose: AddrPurpose = 'receive') {
        return await this.rpc({
            method: 'listlabels',
            params: [purpose],
            id: getRandomId()
        }, `wallet/${wallet}`);
    }

    async listDescriptors(wallet: string, isPrivate: boolean = false): Promise<DescriptorType[]> {
        const resp = await this.rpc({
            method: 'listdescriptors',
            params: [isPrivate],
            id: getRandomId()
        }, `wallet/${wallet}`);
        return resp?.descriptors;
    }

    async getDescriptorInfo(wallet: string, descriptor: string): Promise<DescriptorInfo> {
        return await this.rpc({
            method: 'getdescriptorinfo',
            params: [descriptor],
            id: getRandomId()
        }, `wallet/${wallet}`);
    }

    async importDescriptors(wallet: string, descriptors: ImportDescriptorItem[]): Promise<string> {
        const descriptorsJson = JSON.stringify(descriptors);
        return await this.rpc({
            method: 'importdescriptors',
            params: descriptorsJson,
            id: getRandomId()
        }, `wallet/${wallet}`);
    }

    async getAddressInfo(wallet: string, address: string): Promise<IAddressInfo> {
        return await this.rpc({
            method: 'getaddressinfo',
            params: [address],
            id: getRandomId()
        }, `wallet/${wallet}`);
    }

    async sendToAddress(wallet: string, address: string, amount: number, comment: string, feeRate: number): Promise<string> {
        const subtractfeefromamount = false;
        const replaceable = true;
        const conf_target = undefined;
        const estimate_mode = 'unset';
        const avoidReuse = false;
        const verbose = true;
        const result = await this.rpc({
            method: 'sendtoaddress',
            params: [address, amount, comment, 'ct', subtractfeefromamount, replaceable, conf_target,
                estimate_mode, avoidReuse, feeRate, verbose],
            id: getRandomId()
        }, `wallet/${wallet}`);
        console.log("sendToAddress result:", result);
        return result.txid;
    }

    async listTransactions(wallet: string, label: string, count: number, skip: number, includeWatchOnly: boolean) {
        return await this.rpc({
            method: 'listtransactions',
            params: [label, count, skip, includeWatchOnly],
            id: getRandomId()
        }, `wallet/${wallet}`);
    }

    async getRawChangeAddress(wallet: string, addressType: string) {
        return await this.rpc({
            method: 'getrawchangeaddress',
            params: [addressType],
            id: getRandomId()
        }, `wallet/${wallet}`);
    }


    async listUnspent(wallet: string, config: IListUnspentConfig): Promise<IListUnspentResponse[]> {
        // convert config to params
        const params = [
            config.minconf || 6, 
            config.maxconf || 999999999, 
            config.addresses || "[]", 
            config.include_unsafe || false, 
            config.query_options || {},
        ];
        return await this.rpc({
            method: 'listunspent',
            params: params,
            id: getRandomId()
        }, `wallet/${wallet}`);
    }

    async createRawTransaction(wallet: string, inputs: unknown[], outputs: unknown) {
        return await this.rpc({
            method: 'createrawtransaction',
            params: [inputs, outputs],
            id: getRandomId()
        }, `wallet/${wallet}`);
    }

    async signRawTransactionWithWallet(wallet: string, rawTxHex: string) {
        return await this.rpc({
            method: 'signrawtransactionwithwallet',
            params: [rawTxHex],
            id: getRandomId()
        }, `wallet/${wallet}`);
    }
}

function decodeURL(str: string) {
    let parsedUrl = new URL(str);
    let hostname = parsedUrl.hostname;
    let port = parseInt(parsedUrl.port, 10);
    let protocol = parsedUrl.protocol;
    // strip trailing ":"
    protocol = protocol.substring(0, protocol.length - 1);
    let user = parsedUrl.username;
    let pass = parsedUrl.password;
    let opts = {
        host: hostname,
        port: port,
        protocol: protocol,
        user: user,
        pass: pass,
    };
    return opts;
}
type ArgMap = (arg: any) => any;
type ApiCalls = { [key: string]: string };
type RpcCall = (options: any, callback: Function) => void;

function generateRPCMethods(constructor: any, apiCalls: ApiCalls) {

    function createRPCMethod(methodName: string, argMap: ArgMap[]): Function {
        return async function (...args: any[]) {

            let limit = args.length - 1;


            for (let i = 0; i < limit; i++) {
                if (argMap[i]) {
                    args[i] = argMap[i](args[i]);
                }
            }

            return await this.rpc({
                method: methodName,
                params: args.slice(0, args.length - 1),
                id: getRandomId()
            }, args[args.length - 1]);

        };
    };

    const types: { [key: string]: ArgMap } = {
        str: function (arg: any) {
            return arg.toString();
        },
        int: function (arg: any) {
            return parseFloat(arg);
        },
        float: function (arg: any) {
            return parseFloat(arg);
        },
        bool: function (arg: any) {
            return (arg === true || arg == '1' || arg == 'true' || arg.toString().toLowerCase() == 'true');
        },
        obj: function (arg: any) {
            if (typeof arg === 'string') {
                return JSON.parse(arg);
            }
            return arg;
        }
    };

    for (let k in apiCalls) {
        let spec: ArgMap[] = [];
        if (apiCalls[k].length) {
            spec = apiCalls[k].split(' ').map(s => types[s] || types.str);
        }
        const methodName = k.toLowerCase();
        constructor.prototype[k] = createRPCMethod(methodName, spec);
        constructor.prototype[methodName] = constructor.prototype[k];
    }

}

function getRandomId(): number {
    return parseInt((Math.random() * 100000).toString(), 10);
}

generateRPCMethods(RpcClient, CALL_SPEC);
export const gRpcClient = new RpcClient({
    protocol: "http",
    host: "localhost",
    port: 9800,
    user: "golden",
    pass: "wallet",
});
export default RpcClient;