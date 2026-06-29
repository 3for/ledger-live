import {
  DeviceActionStatus,
  type DeviceActionState,
  type DeviceManagementKit,
} from "@ledgerhq/device-management-kit";
import {
  type AppConfiguration,
  type ECDHOptions,
  type ECDHPairKey,
  type GetAppConfigurationDAError,
  type GetAddressDAError,
  type GetECDHPairKeyDAError,
  type MessageOptions,
  type SignPersonalMessageDAError,
  type SignTransactionDAError,
  type SignTransactionHashDAError,
  type Signature,
  SignerTronBuilder,
  TronClearSignContextType,
  type TronTrc10TokenContext,
  type SignerTron,
  type SignTypedDataDAError,
  type SignTypedDataHashDAError,
  type TransactionOptions,
  type TypedData,
  type TypedDataOptions,
} from "@ledgerhq/device-signer-kit-tron";
import { LockedDeviceError, UserRefusedOnDevice } from "@ledgerhq/errors";
import { lastValueFrom, type Observable } from "rxjs";
import type { DmkSignerTronOptions, TronAddress, TronSignature, TronSignerExtended } from "./types";

type DAError =
  | GetAddressDAError
  | GetAppConfigurationDAError
  | GetECDHPairKeyDAError
  | SignPersonalMessageDAError
  | SignTransactionDAError
  | SignTransactionHashDAError
  | SignTypedDataDAError
  | SignTypedDataHashDAError;

function stripHexPrefix(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value;
}

function formatSignature(signature: Signature): TronSignature {
  return `${stripHexPrefix(signature.r)}${stripHexPrefix(signature.s)}${signature.v
    .toString(16)
    .padStart(2, "0")}`;
}

function tokenSignaturesToContexts(tokenSignatures: string[]): TronTrc10TokenContext[] {
  return tokenSignatures.map((payload, tokenIndex) => ({
    type: TronClearSignContextType.TRC10_TOKEN,
    payload,
    tokenIndex,
  }));
}

export class DmkSignerTron implements TronSignerExtended {
  private readonly signer: SignerTron;

  constructor(dmk: DeviceManagementKit, sessionId: string, options: DmkSignerTronOptions = {}) {
    const builder = new SignerTronBuilder({
      dmk,
      sessionId,
      originToken: "ledger-wallet",
    });

    this.signer =
      options.contextModule === undefined
        ? builder.build()
        : builder.withContextModule(options.contextModule).build();
  }

  private _mapError<E extends DAError>(error: E): Error {
    if (!("errorCode" in error)) {
      return new Error(error._tag);
    }

    switch (error.errorCode) {
      case "5515":
        return new LockedDeviceError();
      case "6982":
      case "6985":
        return new UserRefusedOnDevice();
      default:
        return new Error(error._tag);
    }
  }

  private _mapResult<T, E extends DAError, I>(actionState: DeviceActionState<T, E, I>): T {
    switch (actionState.status) {
      case DeviceActionStatus.Completed:
        return actionState.output;
      case DeviceActionStatus.Error:
        throw this._mapError(actionState.error);
      case DeviceActionStatus.NotStarted:
      case DeviceActionStatus.Pending:
      case DeviceActionStatus.Stopped:
      default:
        throw new Error("Unknown device action status");
    }
  }

  private async _runDeviceAction<T, E extends DAError, I>(action: {
    readonly observable: Observable<DeviceActionState<T, E, I>>;
  }): Promise<T> {
    return this._mapResult<T, E, I>(await lastValueFrom(action.observable));
  }

  async getAddress(path: string, boolDisplay?: boolean): Promise<TronAddress> {
    return this._runDeviceAction(
      this.signer.getAddress(path, {
        checkOnDevice: !!boolDisplay,
        skipOpenApp: true,
      }),
    );
  }

  async getAppConfiguration(): Promise<AppConfiguration> {
    return this._runDeviceAction(this.signer.getAppConfiguration());
  }

  async getECDHPairKey(
    path: string,
    publicKey: string | Uint8Array,
    options?: ECDHOptions,
  ): Promise<ECDHPairKey> {
    return this._runDeviceAction(
      this.signer.getECDHPairKey(path, publicKey, {
        ...options,
        skipOpenApp: options?.skipOpenApp ?? true,
      }),
    );
  }

  async signTransaction(
    path: string,
    rawData: Uint8Array,
    options?: TransactionOptions,
  ): Promise<Signature> {
    return this._runDeviceAction(
      this.signer.signTransaction(path, rawData, {
        ...options,
        skipOpenApp: options?.skipOpenApp ?? true,
      }),
    );
  }

  async signTransactionHash(path: string, hash: Uint8Array): Promise<Signature> {
    return this._runDeviceAction(this.signer.signTransactionHash(path, hash));
  }

  async signMessage(
    path: string,
    message: string | Uint8Array,
    options?: MessageOptions,
  ): Promise<Signature> {
    return this._runDeviceAction(
      this.signer.signMessage(path, message, {
        ...options,
        skipOpenApp: options?.skipOpenApp ?? true,
      }),
    );
  }

  async signTypedData(
    path: string,
    typedData: TypedData,
    options?: TypedDataOptions,
  ): Promise<Signature> {
    return this._runDeviceAction(
      this.signer.signTypedData(path, typedData, {
        ...options,
        skipOpenApp: options?.skipOpenApp ?? true,
      }),
    );
  }

  async signTypedDataHash(
    path: string,
    domainHash: Uint8Array,
    messageHash: Uint8Array,
  ): Promise<Signature> {
    return this._runDeviceAction(this.signer.signTypedDataHash(path, domainHash, messageHash));
  }

  async sign(path: string, rawTxHex: string, tokenSignatures: string[]): Promise<TronSignature> {
    const signature = await this.signTransaction(path, Buffer.from(rawTxHex, "hex"), {
      skipOpenApp: true,
      contexts: tokenSignaturesToContexts(tokenSignatures),
    });

    return formatSignature(signature);
  }
}
