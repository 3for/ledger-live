import { defineCommand } from "@bunli/core";
import { DmkSignerTron } from "@ledgerhq/live-signer-tron";
import { makeEnvelope } from "../../../shared/response";
import { colors, writeStdout } from "../../../shared/ui";
import { ensureWalletCliDmkTransport } from "../../../device/register-dmk-transport";
import { WalletCliDeviceError } from "../../../device/wallet-cli-device-error";
import {
  getManagerAppNameForCurrencyId,
  withCurrencyDeviceSession,
} from "../../../session/bridge-device-session";
import { createCommandOutput } from "../../../output";
import { deviceTimeoutOption, outputOption, resolveOutputFormat } from "../../inputs";

type TronAppConfiguration = Awaited<ReturnType<DmkSignerTron["getAppConfiguration"]>>;

function writeAppConfigurationHuman(config: TronAppConfiguration): void {
  writeStdout(`${colors.bold("Version:")} ${config.version}`);
  writeStdout(`${colors.bold("Allow data:")} ${String(config.allowData)}`);
  writeStdout(`${colors.bold("Allow custom contract:")} ${String(config.allowCustomContract)}`);
  writeStdout(`${colors.bold("Truncate address:")} ${String(config.truncateAddress)}`);
  writeStdout(`${colors.bold("Sign by hash:")} ${String(config.signByHash)}`);
  writeStdout(`${colors.bold("Verbose TIP-712:")} ${String(config.verboseTip712)}`);
  writeStdout(`${colors.bold("Display hash:")} ${String(config.displayHash)}`);
}

function writeAppConfigurationJson(config: TronAppConfiguration): void {
  writeStdout(
    JSON.stringify(
      makeEnvelope("signer tron app-config", "tron:main", { appConfiguration: config }),
    ),
  );
}

export default defineCommand({
  name: "app-config",
  description: "Read Tron app configuration through the DMK signer-tron adapter",
  options: {
    output: outputOption,
    "device-timeout": deviceTimeoutOption,
  },
  handler: async ({ flags }) => {
    const output = resolveOutputFormat(flags.output);
    const out = createCommandOutput(output, {
      command: "signer tron app-config",
      network: "tron:main",
    });
    const managerAppName = getManagerAppNameForCurrencyId("tron");

    await out.run(async () => {
      const spin = out.spin(`Connect device and open ${colors.bold(managerAppName)} app…`);
      let appConfiguration: TronAppConfiguration | undefined;

      await withCurrencyDeviceSession(
        "tron",
        async () => {
          const transport = await ensureWalletCliDmkTransport();
          const signer = new DmkSignerTron(transport.dmk, transport.sessionId);

          try {
            appConfiguration = await signer.getAppConfiguration();
          } catch (error) {
            throw WalletCliDeviceError.fromUnknown(error, {
              expectedApp: managerAppName,
              rejectedContext: "open_app",
            });
          }
        },
        {
          deviceTimeoutMs: flags["device-timeout"],
          onStateChange: state => out.deviceState(state),
        },
      );

      if (appConfiguration === undefined) {
        throw new Error("Tron app configuration completed without a result.");
      }

      spin?.success("Read Tron app configuration");
      if (output === "json") {
        writeAppConfigurationJson(appConfiguration);
      } else {
        writeAppConfigurationHuman(appConfiguration);
      }
    });
  },
});
