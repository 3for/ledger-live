import { defineCommand, option } from "@bunli/core";
import { DmkSignerTron } from "@ledgerhq/live-signer-tron";
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
const HASH_HEX_LENGTH = 64;

type TronHashSignature = Awaited<ReturnType<DmkSignerTron["signTransactionHash"]>>;

function stripHexPrefix(value: string): string {
  return value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
}

function resolveHashArg(hash: string | undefined, positional: readonly string[]): string {
  const value = hash ?? positional[0];
  if (!value) {
    throw new Error(
      "Missing hash: use --hash <32-byte-hex> or pass it as the first positional argument.",
    );
  }
  return value;
}

function parseHash(hash: string): Uint8Array {
  const hex = stripHexPrefix(hash);
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length !== HASH_HEX_LENGTH) {
    throw new Error("Invalid transaction hash: expected a 32-byte hex string.");
  }
  return Buffer.from(hex, "hex");
}

function writeSignatureHuman(path: string, hash: string, signature: TronHashSignature): void {
  writeStdout(`${colors.bold("Path:")} ${path}`);
  writeStdout(`${colors.bold("Hash:")} ${hash}`);
  writeStdout(`${colors.bold("r:")} ${signature.r}`);
  writeStdout(`${colors.bold("s:")} ${signature.s}`);
  writeStdout(`${colors.bold("v:")} ${String(signature.v)}`);
}

function writeSignatureJson(path: string, hash: string, signature: TronHashSignature): void {
  writeStdout(
    JSON.stringify(
      makeEnvelope("signer tron tx-hash", "tron:main", {
        path,
        hash,
        signature,
      }),
    ),
  );
}

export default defineCommand({
  name: "tx-hash",
  description: "Sign a Tron transaction hash through the DMK signer-tron adapter",
  options: {
    hash: option(z.string().min(1).optional(), {
      description: "32-byte transaction hash as hex. Can also be the first positional argument.",
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
      command: "signer tron tx-hash",
      network: "tron:main",
    });
    const managerAppName = getManagerAppNameForCurrencyId("tron");

    await out.run(async () => {
      const hash = resolveHashArg(flags.hash, positional);
      const hashBytes = parseHash(hash);
      const spin = out.spin(`Connect device and open ${colors.bold(managerAppName)} app…`);
      let signature: TronHashSignature | undefined;

      await withCurrencyDeviceSession(
        "tron",
        async () => {
          const transport = await ensureWalletCliDmkTransport();
          const signer = new DmkSignerTron(transport.dmk, transport.sessionId);

          try {
            signature = await signer.signTransactionHash(flags.path, hashBytes);
          } catch (error) {
            throw WalletCliDeviceError.fromUnknown(error, {
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
        throw new Error("Tron transaction hash signing completed without a signature.");
      }

      spin?.success("Tron transaction hash signed");
      if (output === "json") {
        writeSignatureJson(flags.path, hash, signature);
      } else {
        writeSignatureHuman(flags.path, hash, signature);
      }
    });
  },
});
