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

type TronTypedDataHashSignature = Awaited<ReturnType<DmkSignerTron["signTypedDataHash"]>>;

function stripHexPrefix(value: string): string {
  return value.startsWith("0x") || value.startsWith("0X") ? value.slice(2) : value;
}

function resolveHashArg(
  value: string | undefined,
  positional: readonly string[],
  positionalIndex: number,
  name: string,
): string {
  const resolved = value ?? positional[positionalIndex];
  if (!resolved) {
    throw new Error(
      `Missing ${name}: use --${name} <32-byte-hex> or pass it as positional argument ${positionalIndex + 1}.`,
    );
  }
  return resolved;
}

function parseHash(hash: string, name: string): Uint8Array {
  const hex = stripHexPrefix(hash);
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length !== HASH_HEX_LENGTH) {
    throw new Error(`Invalid ${name}: expected a 32-byte hex string.`);
  }
  return Buffer.from(hex, "hex");
}

function writeSignatureHuman(
  path: string,
  domainHash: string,
  messageHash: string,
  signature: TronTypedDataHashSignature,
): void {
  writeStdout(`${colors.bold("Path:")} ${path}`);
  writeStdout(`${colors.bold("Domain hash:")} ${domainHash}`);
  writeStdout(`${colors.bold("Message hash:")} ${messageHash}`);
  writeStdout(`${colors.bold("r:")} ${signature.r}`);
  writeStdout(`${colors.bold("s:")} ${signature.s}`);
  writeStdout(`${colors.bold("v:")} ${String(signature.v)}`);
}

function writeSignatureJson(
  path: string,
  domainHash: string,
  messageHash: string,
  signature: TronTypedDataHashSignature,
): void {
  writeStdout(
    JSON.stringify(
      makeEnvelope("signer tron typed-data-hash", "tron:main", {
        path,
        domainHash,
        messageHash,
        signature,
      }),
    ),
  );
}

export default defineCommand({
  name: "typed-data-hash",
  description: "Sign TIP-712 domain and message hashes through the DMK signer-tron adapter",
  options: {
    "domain-hash": option(z.string().min(1).optional(), {
      description:
        "32-byte TIP-712 domain separator hash as hex. Can also be the first positional argument.",
    }),
    "message-hash": option(z.string().min(1).optional(), {
      description:
        "32-byte TIP-712 hashStruct(message) as hex. Can also be the second positional argument.",
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
      command: "signer tron typed-data-hash",
      network: "tron:main",
    });
    const managerAppName = getManagerAppNameForCurrencyId("tron");

    await out.run(async () => {
      const domainHash = resolveHashArg(flags["domain-hash"], positional, 0, "domain-hash");
      const messageHash = resolveHashArg(flags["message-hash"], positional, 1, "message-hash");
      const domainHashBytes = parseHash(domainHash, "domain-hash");
      const messageHashBytes = parseHash(messageHash, "message-hash");
      const spin = out.spin(`Connect device and open ${colors.bold(managerAppName)} app…`);
      let signature: TronTypedDataHashSignature | undefined;

      await withCurrencyDeviceSession(
        "tron",
        async () => {
          const transport = await ensureWalletCliDmkTransport();
          const signer = new DmkSignerTron(transport.dmk, transport.sessionId);

          try {
            signature = await signer.signTypedDataHash(
              flags.path,
              domainHashBytes,
              messageHashBytes,
            );
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
        throw new Error("Tron typed data hash signing completed without a signature.");
      }

      spin?.success("Tron typed data hashes signed");
      if (output === "json") {
        writeSignatureJson(flags.path, domainHash, messageHash, signature);
      } else {
        writeSignatureHuman(flags.path, domainHash, messageHash, signature);
      }
    });
  },
});
