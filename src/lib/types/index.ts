interface IProduct {

}

export interface IAddress {
  type: string;
  label: string;
  address: string;
}

export interface IWalletInfo {
  balance: number
  immature_balance: number
  unconfirmed_balance: number
  descriptor: boolean
  walletname: string
  lastBlock: string
  height: number
} 

export interface IAddressInfo {
  address: string
  scriptPubKey: string
  ismine: boolean
  solvable: boolean
  desc: string
  iswatchonly: boolean
  isscript: boolean
  iswitness: boolean
  witness_version: number
  witness_program: string
  pubkey: string
  ischange: boolean
  timestamp: number //seconds
  labels: string[],
  type: AddrType, // this is a custom field
}

export type AddrType = 'legacy' | 'p2sh-segwit' | 'bech32' | 'bech32m';

export type AddrPurpose = 'receive' | 'send';

export interface DescriptorType {
  desc: string;
  timestamp: number;
  active: boolean;
  internal: boolean;
  range: [number, number];
  next?: number;
  next_index: number;
}

export interface DescriptorInfo {
  descriptor: string;
  checksum: string;
  isrange: boolean;
  issolvable: boolean;
  hasprivatekeys: boolean;
}

export interface ImportDescriptorItem {
  desc: string;
  timestamp: number|"now";
  active: boolean;
  internal: boolean;
  range: [number, number];
  next_index: number;
}
// {
//   "address": "bc1qqktu6shc7rjzx4txqvlzmkltne2saw8f9c77yy",
//   "category": "send",
//   "amount": -100.00000000,
//   "label": "b32",
//   "vout": 0,
//   "fee": -0.00013100,
//   "confirmations": 1,
//   "blockhash": "3d216ba2e19deedd2c2832eb8f83846341be24668bd75be97f34744363a0366d",
//   "blockheight": 29586,
//   "blockindex": 1,
//   "blocktime": 1717909900,
//   "txid": "82fc311b0a54f397c4f3997fbfc5b9bd9fb1fe4e0cb5033cc18ca420d09d85b0",
//   "wtxid": "08e805355c15ce8b6ebd6a635292be6baa47a1c59b69b4873869b701a6b67c73",
//   "walletconflicts": [
//   ],
//   "time": 1717909906,
//   "timereceived": 1717909906,
//   "bip125-replaceable": "no",
//   "comment": "test",
//   "to": "ct",
//   "abandoned": false
// }


export type TransactionCategory = '*' | 'send' | 'receive' | 'generate' | 'immature' | 'orphan' | 'unknown';

export interface ITransaction {
  address: string
  category: TransactionCategory
  amount: number
  label: string
  vout: number
  fee: number
  confirmations: number
  blockhash: string
  blockheight: number
  blockindex: number
  blocktime: number
  txid: string
  wtxid: string
  walletconflicts: string[]
  time: number
  timereceived: number
  bip125replaceable: string
  comment: string
  to: string
  abandoned: boolean
}


export interface IBlockchainInfo {
  chain: string
  blocks: number
  headers: number
  bestblockhash: string
  difficulty: number
  mediantime: number
  time: number
  verificationprogress: number
  initialblockdownload: boolean
  chainwork: string
  size_on_disk: number
  pruned: boolean
  warnings: string
}

export interface IListUnspentResponse {
  txid: string;
  vout: number;
  address: string;
  label: string;
  scriptPubKey: string;
  amount: number;
  confirmations: number;
  spendable: boolean;
  solvable: boolean;
  desc: string;
  parent_desc: string;
  safe: boolean;
}