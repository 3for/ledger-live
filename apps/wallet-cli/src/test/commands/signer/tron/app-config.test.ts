import { beforeEach, describe, expect, it, mock } from "bun:test";
import { runCli } from "../../../helpers/cli-runner";

const APP_CONFIGURATION = {
  version: "1.2.3",
  allowData: true,
  allowCustomContract: false,
  truncateAddress: true,
  signByHash: false,
  verboseTip712: true,
  displayHash: false,
};

const getAppConfigurationMock = mock(async () => APP_CONFIGURATION);
const DmkSignerTronMock = mock(function DmkSignerTron() {
  return {
    getAppConfiguration: getAppConfigurationMock,
  };
});

mock.module("@ledgerhq/live-signer-tron", () => ({
  DmkSignerTron: DmkSignerTronMock,
  LegacySignerTron: mock(function LegacySignerTron() {}),
}));

const MOCK_DMK_ENV = {
  WALLET_CLI_MOCK_DMK: "1",
};

describe("signer tron app-config command (mock DMK)", () => {
  beforeEach(() => {
    DmkSignerTronMock.mockClear();
    getAppConfigurationMock.mockClear();
  });

  it("json output: reads Tron app configuration through DmkSignerTron", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      ["signer", "tron", "app-config", "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(DmkSignerTronMock).toHaveBeenCalledTimes(1);
    expect(getAppConfigurationMock).toHaveBeenCalledTimes(1);

    const data = JSON.parse(stdout);
    expect(data).toMatchObject({
      status: "success",
      command: "signer tron app-config",
      network: "tron:main",
      appConfiguration: APP_CONFIGURATION,
    });
  });

  it("human output: prints app configuration fields", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      ["signer", "tron", "app-config", "--output", "human"],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(stdout).toContain("Version: 1.2.3");
    expect(stdout).toContain("Allow data: true");
    expect(stdout).toContain("Sign by hash: false");
    expect(stdout).toContain("Verbose TIP-712: true");
  });
});
