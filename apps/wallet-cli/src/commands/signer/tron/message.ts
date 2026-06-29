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

type TronMessageSignature = Awaited<ReturnType<DmkSignerTron["signMessage"]>>;

function resolveMessageArg(message: string | undefined, positional: readonly string[]): string {
  const value = message ?? positional[0];
  if (!value) {
    throw new Error(
      "Missing message: use --message <text> or pass it as the first positional argument.",
    );
  }
  return value;
}

function writeSignatureHuman(path: string, message: string, signature: TronMessageSignature): void {
  writeStdout(`${colors.bold("Path:")} ${path}`);
  writeStdout(`${colors.bold("Message:")} ${message}`);
  writeStdout(`${colors.bold("r:")} ${signature.r}`);
  writeStdout(`${colors.bold("s:")} ${signature.s}`);
  writeStdout(`${colors.bold("v:")} ${String(signature.v)}`);
}

function writeSignatureJson(path: string, message: string, signature: TronMessageSignature): void {
  writeStdout(
    JSON.stringify(
      makeEnvelope("signer tron message", "tron:main", {
        path,
        message,
        signature,
      }),
    ),
  );
}

export default defineCommand({
  name: "message",
  description: "Sign a Tron message through the DMK signer-tron adapter",
  options: {
    message: option(z.string().min(1).optional(), {
      description: "Message text to sign. Can also be the first positional argument.",
      short: "m",
    }),
    path: option(z.string().min(1).default(DEFAULT_TRON_PATH), {
      description: `BIP32 derivation path. Default: ${DEFAULT_TRON_PATH}.`,
    }),
    "full-display": option(z.boolean().default(true), {
      description: "Ask the app to display the full message when supported (default: true).",
      argumentKind: "flag",
    }),
    output: outputOption,
    "device-timeout": deviceTimeoutOption,
  },
  handler: async ({ flags, positional }) => {
    const output = resolveOutputFormat(flags.output);
    const out = createCommandOutput(output, {
      command: "signer tron message",
      network: "tron:main",
    });
    const managerAppName = getManagerAppNameForCurrencyId("tron");

    await out.run(async () => {
      const message = resolveMessageArg(flags.message, positional);
      const spin = out.spin(`Connect device and open ${colors.bold(managerAppName)} app…`);
      let signature: TronMessageSignature | undefined;

      await withCurrencyDeviceSession(
        "tron",
        async () => {
          const transport = await ensureWalletCliDmkTransport();
          const signer = new DmkSignerTron(transport.dmk, transport.sessionId);

          try {
            signature = await signer.signMessage(flags.path, message, {
              fullDisplay: flags["full-display"],
            });
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
        throw new Error("Tron message signing completed without a signature.");
      }

      spin?.success("Tron message signed");
      if (output === "json") {
        writeSignatureJson(flags.path, message, signature);
      } else {
        writeSignatureHuman(flags.path, message, signature);
      }
    });
  },
});
