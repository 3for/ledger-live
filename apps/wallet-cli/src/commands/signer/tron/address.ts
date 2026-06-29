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

type TronAddress = Awaited<ReturnType<DmkSignerTron["getAddress"]>>;

function writeAddressHuman(path: string, verified: boolean, result: TronAddress): void {
  writeStdout(`${colors.bold("Path:")} ${path}`);
  writeStdout(`${colors.bold("Address:")} ${result.address}`);
  writeStdout(`${colors.bold("Public key:")} ${result.publicKey}`);
  writeStdout(`${colors.bold("Verified on device:")} ${String(verified)}`);
}

function writeAddressJson(path: string, verified: boolean, result: TronAddress): void {
  writeStdout(
    JSON.stringify(
      makeEnvelope("signer tron address", "tron:main", {
        path,
        address: result.address,
        publicKey: result.publicKey,
        verified,
      }),
    ),
  );
}

export default defineCommand({
  name: "address",
  description: "Read a Tron address through the DMK signer-tron adapter",
  options: {
    path: option(z.string().min(1).default(DEFAULT_TRON_PATH), {
      description: `BIP32 derivation path. Default: ${DEFAULT_TRON_PATH}.`,
    }),
    verify: option(z.boolean().default(true), {
      description:
        "Verify address on device screen (default: true). Use --no-verify to skip device confirmation.",
      short: "v",
      argumentKind: "flag",
    }),
    output: outputOption,
    "device-timeout": deviceTimeoutOption,
  },
  handler: async ({ flags }) => {
    const output = resolveOutputFormat(flags.output);
    const out = createCommandOutput(output, {
      command: "signer tron address",
      network: "tron:main",
    });
    const managerAppName = getManagerAppNameForCurrencyId("tron");

    await out.run(async () => {
      const spin = out.spin(`Connect device and open ${colors.bold(managerAppName)} app…`);
      let address: TronAddress | undefined;

      await withCurrencyDeviceSession(
        "tron",
        async () => {
          const transport = await ensureWalletCliDmkTransport();
          const signer = new DmkSignerTron(transport.dmk, transport.sessionId);

          try {
            address = await signer.getAddress(flags.path, flags.verify);
          } catch (error) {
            throw WalletCliDeviceError.fromUnknown(error, {
              expectedApp: managerAppName,
              rejectedContext: "verify_address",
            });
          }
        },
        {
          deviceTimeoutMs: flags["device-timeout"],
          onStateChange: state => out.deviceState(state),
        },
      );

      if (address === undefined) {
        throw new Error("Tron address request completed without a result.");
      }

      spin?.success(flags.verify ? "Tron address verified" : "Tron address read");
      if (output === "json") {
        writeAddressJson(flags.path, flags.verify, address);
      } else {
        writeAddressHuman(flags.path, flags.verify, address);
      }
    });
  },
});
