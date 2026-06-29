import { defineCommand, option } from "@bunli/core";
import { DmkSignerTron } from "@ledgerhq/live-signer-tron";
import type { TypedData, TypedDataOptions } from "@ledgerhq/live-signer-tron";
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

const TypedDataFieldSchema = z
  .object({
    name: z.string().min(1),
    type: z.string().min(1),
  })
  .strict();

const TypedDataSchema = z
  .object({
    domain: z
      .object({
        name: z.string().optional(),
        version: z.string().optional(),
        chainId: z.number().optional(),
        verifyingContract: z.string().optional(),
        salt: z.string().optional(),
      })
      .strict(),
    types: z.record(z.string(), z.array(TypedDataFieldSchema)),
    primaryType: z.string().min(1),
    message: z.record(z.string(), z.unknown()),
  })
  .strict();

const TypedDataOptionsSchema = z
  .object({
    skipOpenApp: z.boolean().optional(),
  })
  .strict();

type TronTypedDataSignature = Awaited<ReturnType<DmkSignerTron["signTypedData"]>>;

function resolveTypedDataArg(typedData: string | undefined, positional: readonly string[]): string {
  const value = typedData ?? positional[0];
  if (!value) {
    throw new Error(
      "Missing typed data: use --typed-data <json> or pass it as the first positional argument.",
    );
  }
  return value;
}

function parseJsonObject(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`Invalid ${label}: expected JSON.`);
  }
}

function parseTypedData(value: string): TypedData {
  return TypedDataSchema.parse(parseJsonObject(value, "typed data")) as TypedData;
}

function parseTypedDataOptions(value: string | undefined): TypedDataOptions | undefined {
  if (value === undefined) return undefined;
  return TypedDataOptionsSchema.parse(parseJsonObject(value, "typed data options"));
}

function writeSignatureHuman(
  path: string,
  typedData: TypedData,
  options: TypedDataOptions | undefined,
  signature: TronTypedDataSignature,
): void {
  writeStdout(`${colors.bold("Path:")} ${path}`);
  writeStdout(`${colors.bold("Primary type:")} ${typedData.primaryType}`);
  writeStdout(`${colors.bold("Domain:")} ${typedData.domain.name ?? ""}`);
  writeStdout(`${colors.bold("Options:")} ${JSON.stringify(options ?? {})}`);
  writeStdout(`${colors.bold("r:")} ${signature.r}`);
  writeStdout(`${colors.bold("s:")} ${signature.s}`);
  writeStdout(`${colors.bold("v:")} ${String(signature.v)}`);
}

function writeSignatureJson(
  path: string,
  typedData: TypedData,
  options: TypedDataOptions | undefined,
  signature: TronTypedDataSignature,
): void {
  writeStdout(
    JSON.stringify(
      makeEnvelope("signer tron typed-data", "tron:main", {
        path,
        typedData,
        options: options ?? {},
        signature,
      }),
    ),
  );
}

export default defineCommand({
  name: "typed-data",
  description: "Sign TIP-712 typed data through the DMK signer-tron adapter",
  options: {
    "typed-data": option(z.string().min(1).optional(), {
      description: "TIP-712 typed data JSON. Can also be the first positional argument.",
    }),
    options: option(z.string().min(1).optional(), {
      description: "Optional signer-tron TypedDataOptions JSON. Example: '{\"skipOpenApp\":true}'.",
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
      command: "signer tron typed-data",
      network: "tron:main",
    });
    const managerAppName = getManagerAppNameForCurrencyId("tron");

    await out.run(async () => {
      const typedData = parseTypedData(resolveTypedDataArg(flags["typed-data"], positional));
      const typedDataOptions = parseTypedDataOptions(flags.options);
      const spin = out.spin(`Connect device and open ${colors.bold(managerAppName)} app…`);
      let signature: TronTypedDataSignature | undefined;

      await withCurrencyDeviceSession(
        "tron",
        async () => {
          const transport = await ensureWalletCliDmkTransport();
          const signer = new DmkSignerTron(transport.dmk, transport.sessionId);

          try {
            signature = await signer.signTypedData(flags.path, typedData, typedDataOptions);
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
        throw new Error("Tron typed data signing completed without a signature.");
      }

      spin?.success("Tron typed data signed");
      if (output === "json") {
        writeSignatureJson(flags.path, typedData, typedDataOptions, signature);
      } else {
        writeSignatureHuman(flags.path, typedData, typedDataOptions, signature);
      }
    });
  },
});
