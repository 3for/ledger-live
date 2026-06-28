export type TronAddress = {
  readonly publicKey: string;
  readonly address: string;
};

export type TronSignature = string;

export interface TronSigner {
  getAddress(path: string, boolDisplay?: boolean): Promise<TronAddress>;
  sign(path: string, rawTxHex: string, tokenSignatures: string[]): Promise<TronSignature>;
}
