import { defineCommand, option } from "@bunli/core";
import { DmkSignerTron, type TronClearSignContext } from "@ledgerhq/live-signer-tron";
import { z } from "zod";
import { ensureWalletCliDmkTransport } from "../../../device/register-dmk-transport";
import { WalletCliDeviceError } from "../../../device/wallet-cli-device-error";
import { createCommandOutput } from "../../../output";
import { makeEnvelope } from "../../../shared/response";
import { colors, writeStdout } from "../../../shared/ui";
import {
  getManagerAppNameForCurrencyId,
  withCurrencyDeviceSession,
} from "../../../session/bridge-device-session";
import { deviceTimeoutOption, outputOption, resolveOutputFormat } from "../../inputs";

const DEFAULT_TRON_PATH = "44'/195'/0'/0/0";

type TronTransactionSignature = Awaited<ReturnType<DmkSignerTron["signTransaction"]>>;

function stripHexPrefix(value: string): string {
  return value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
}

function resolveRawTxArg(rawTx: string | undefined, positional: readonly string[]): string {
  const value = rawTx ?? positional[0];
  if (!value) {
    throw new Error(
      "Missing raw transaction: use --raw-tx <hex> or pass it as the first positional argument.",
    );
  }
  return value;
}

function parseRawTx(rawTx: string): Uint8Array {
  const hex = stripHexPrefix(rawTx);
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Invalid raw transaction: expected an even-length hex string.");
  }
  return Buffer.from(hex, "hex");
}

function parseContexts(contexts: string | undefined): TronClearSignContext[] | undefined {
  if (contexts === undefined) return undefined;

  const parsed: unknown = JSON.parse(contexts);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid contexts: expected a JSON array.");
  }
  return parsed as TronClearSignContext[];
}

function isTronAppCommandError(error: unknown): boolean {
  if (error instanceof Error && error.message === "TronAppCommandError") return true;
  if (typeof error !== "object" || error === null) return false;
  const tag = "_tag" in error ? (error as { _tag: unknown })._tag : undefined;
  const name = "name" in error ? (error as { name: unknown }).name : undefined;
  return tag === "TronAppCommandError" || name === "TronAppCommandError";
}

function mapSignTransactionError(error: unknown): unknown {
  if (!isTronAppCommandError(error)) return error;
  return new Error(
    "Tron app rejected the raw transaction. Pass a valid Tron raw_data_hex generated for this account; arbitrary bytes are not signable.",
  );
}

function writeSignatureHuman(
  path: string,
  rawTx: string,
  contexts: TronClearSignContext[] | undefined,
  signature: TronTransactionSignature,
): void {
  writeStdout(`${colors.bold("Path:")} ${path}`);
  writeStdout(`${colors.bold("Raw transaction:")} ${rawTx}`);
  writeStdout(`${colors.bold("Contexts:")} ${String(contexts?.length ?? 0)}`);
  writeStdout(`${colors.bold("r:")} ${signature.r}`);
  writeStdout(`${colors.bold("s:")} ${signature.s}`);
  writeStdout(`${colors.bold("v:")} ${String(signature.v)}`);
}

function writeSignatureJson(
  path: string,
  rawTx: string,
  contexts: TronClearSignContext[] | undefined,
  signature: TronTransactionSignature,
): void {
  writeStdout(
    JSON.stringify(
      makeEnvelope("signer tron tx", "tron:main", {
        path,
        rawTx,
        contexts: contexts ?? [],
        signature,
      }),
    ),
  );
}

export default defineCommand({
  name: "tx",
  description: "Sign a Tron raw transaction through the DMK signer-tron adapter",
  options: {
    "raw-tx": option(z.string().min(1).optional(), {
      description: "Unsigned Tron raw_data_hex as hex. Can also be the first positional argument.",
    }),
    contexts: option(z.string().min(1).optional(), {
      description:
        'Optional signer-tron clear-sign contexts as a JSON array. Example: \'[{"type":"tronTrc10Token","payload":"...","tokenIndex":0}]\'.',
    }),
    path: option(z.string().min(1).default(DEFAULT_TRON_PATH), {
      description: `BIP32 derivation path. Default: ${DEFAULT_TRON_PATH}.`,
    }),
    output: outputOption,
    "device-timeout": deviceTimeoutOption,
  },
  handler: async ({ flags, positional }) => {
    const output = resolveOutputFormat(flags.output);
    const out = createCommandOutput(output, {
      command: "signer tron tx",
      network: "tron:main",
    });
    const managerAppName = getManagerAppNameForCurrencyId("tron");

    await out.run(async () => {
      const rawTx = resolveRawTxArg(flags["raw-tx"], positional);
      const rawTxBytes = parseRawTx(rawTx);
      const contexts = parseContexts(flags.contexts);
      const spin = out.spin(`Connect device and open ${colors.bold(managerAppName)} app…`);
      let signature: TronTransactionSignature | undefined;

      await withCurrencyDeviceSession(
        "tron",
        async () => {
          const transport = await ensureWalletCliDmkTransport();
          const signer = new DmkSignerTron(transport.dmk, transport.sessionId);

          try {
            signature = await signer.signTransaction(
              flags.path,
              rawTxBytes,
              contexts === undefined ? undefined : { contexts },
            );
          } catch (error) {
            throw WalletCliDeviceError.fromUnknown(mapSignTransactionError(error), {
              expectedApp: managerAppName,
              rejectedContext: "sign",
            });
          }
        },
        {
          deviceTimeoutMs: flags["device-timeout"],
          onStateChange: state => out.deviceState(state),
        },
      );

      if (signature === undefined) {
        throw new Error("Tron transaction signing completed without a signature.");
      }

      spin?.success("Tron transaction signed");
      if (output === "json") {
        writeSignatureJson(flags.path, rawTx, contexts, signature);
      } else {
        writeSignatureHuman(flags.path, rawTx, contexts, signature);
      }
    });
  },
});
