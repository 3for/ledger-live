import {
  DeviceActionStatus,
  type DeviceActionState,
  type DeviceManagementKit,
} from "@ledgerhq/device-management-kit";
import {
  type GetAddressDAError,
  type SignTransactionDAError,
  type Signature,
  SignerTronBuilder,
  TronClearSignContextType,
  type TronTrc10TokenContext,
  type SignerTron,
} from "@ledgerhq/device-signer-kit-tron";
import { LockedDeviceError, UserRefusedOnDevice } from "@ledgerhq/errors";
import { lastValueFrom } from "rxjs";
import type { TronAddress, TronSignature, TronSigner } from "./types";

type DAError = GetAddressDAError | SignTransactionDAError;

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

export class DmkSignerTron implements TronSigner {
  private readonly signer: SignerTron;

  constructor(dmk: DeviceManagementKit, sessionId: string) {
    this.signer = new SignerTronBuilder({
      dmk,
      sessionId,
      originToken: "ledger-wallet",
    }).build();
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

  private _mapResult<T, E extends DAError>(actionState: DeviceActionState<T, E, unknown>): T {
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

  async getAddress(path: string, boolDisplay?: boolean): Promise<TronAddress> {
    return this._mapResult(
      await lastValueFrom(
        this.signer.getAddress(path, {
          checkOnDevice: !!boolDisplay,
          skipOpenApp: true,
        }).observable,
      ),
    );
  }

  async sign(path: string, rawTxHex: string, tokenSignatures: string[]): Promise<TronSignature> {
    const signature = this._mapResult(
      await lastValueFrom(
        this.signer.signTransaction(path, Buffer.from(rawTxHex, "hex"), {
          skipOpenApp: true,
          contexts: tokenSignaturesToContexts(tokenSignatures),
        }).observable,
      ),
    );

    return formatSignature(signature);
  }
}
