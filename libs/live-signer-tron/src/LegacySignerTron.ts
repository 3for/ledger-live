import Trx from "@ledgerhq/hw-app-trx";
import type Transport from "@ledgerhq/hw-transport";
import type { TronAddress, TronSignature, TronSigner } from "./types";

export class LegacySignerTron implements TronSigner {
  private readonly signer: Trx;

  constructor(transport: Transport) {
    this.signer = new Trx(transport);
  }

  getAddress(path: string, boolDisplay?: boolean): Promise<TronAddress> {
    return this.signer.getAddress(path, boolDisplay);
  }

  sign(path: string, rawTxHex: string, tokenSignatures: string[]): Promise<TronSignature> {
    return this.signer.signTransaction(path, rawTxHex, tokenSignatures);
  }
}
