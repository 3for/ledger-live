import type {
  AppConfiguration,
  ECDHOptions,
  ECDHPairKey,
  MessageOptions,
  Signature,
  TransactionOptions,
  TronClearSignContext,
  TronTrc10TokenContext,
  TronContextModule,
  TypedData,
  TypedDataOptions,
} from "@ledgerhq/device-signer-kit-tron";

export { TronClearSignContextType } from "@ledgerhq/device-signer-kit-tron";
export type {
  TronClearSignContext,
  TronContextModule,
  TronTrc10TokenContext,
} from "@ledgerhq/device-signer-kit-tron";

export type TronAddress = {
  readonly publicKey: string;
  readonly address: string;
};

export type TronSignature = string;

export type DmkSignerTronOptions = {
  readonly contextModule?: TronContextModule;
};

// Bridge-facing API consumed by @ledgerhq/coin-tron.
export interface TronSigner {
  getAddress(path: string, boolDisplay?: boolean): Promise<TronAddress>;
  sign(path: string, rawTxHex: string, tokenSignatures: string[]): Promise<TronSignature>;
}

// DMK-only API exposed by live-signer-tron for direct signer-tron use cases.
export interface TronSignerExtended extends TronSigner {
  getAppConfiguration(): Promise<AppConfiguration>;
  getECDHPairKey(
    path: string,
    publicKey: string | Uint8Array,
    options?: ECDHOptions,
  ): Promise<ECDHPairKey>;
  signTransaction(
    path: string,
    rawData: Uint8Array,
    options?: TransactionOptions,
  ): Promise<Signature>;
  signTransactionHash(path: string, hash: Uint8Array): Promise<Signature>;
  signMessage(
    path: string,
    message: string | Uint8Array,
    options?: MessageOptions,
  ): Promise<Signature>;
  signTypedData(path: string, typedData: TypedData, options?: TypedDataOptions): Promise<Signature>;
  signTypedDataHash(
    path: string,
    domainHash: Uint8Array,
    messageHash: Uint8Array,
  ): Promise<Signature>;
}
