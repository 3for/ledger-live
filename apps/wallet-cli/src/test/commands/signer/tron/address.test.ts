import { beforeEach, describe, expect, it, mock } from "bun:test";
import { runCli } from "../../../helpers/cli-runner";

const TRON_ADDRESS = {
  publicKey: "04deadbeef",
  address: "TFMA7iav1S9K46K2QaSKL5PV73qk4LcEcZ",
};

const DEFAULT_PATH = "44'/195'/0'/0/0";
const CUSTOM_PATH = "44'/195'/2'/0/0";

const getAddressMock = mock(async () => TRON_ADDRESS);
const DmkSignerTronMock = mock(function DmkSignerTron() {
  return {
    getAddress: getAddressMock,
  };
});

mock.module("@ledgerhq/live-signer-tron", () => ({
  DmkSignerTron: DmkSignerTronMock,
  LegacySignerTron: mock(function LegacySignerTron() {}),
}));

const MOCK_DMK_ENV = {
  WALLET_CLI_MOCK_DMK: "1",
};

describe("signer tron address command (mock DMK)", () => {
  beforeEach(() => {
    DmkSignerTronMock.mockClear();
    getAddressMock.mockClear();
  });

  it("json output: reads and verifies the default Tron address path", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      ["signer", "tron", "address", "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(DmkSignerTronMock).toHaveBeenCalledTimes(1);
    expect(getAddressMock).toHaveBeenCalledWith(DEFAULT_PATH, true);

    const data = JSON.parse(stdout);
    expect(data).toMatchObject({
      status: "success",
      command: "signer tron address",
      network: "tron:main",
      path: DEFAULT_PATH,
      address: TRON_ADDRESS.address,
      publicKey: TRON_ADDRESS.publicKey,
      verified: true,
    });
  });

  it("json output: supports custom paths and --no-verify", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      ["signer", "tron", "address", "--path", CUSTOM_PATH, "--no-verify", "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(getAddressMock).toHaveBeenCalledWith(CUSTOM_PATH, false);

    const data = JSON.parse(stdout);
    expect(data.path).toBe(CUSTOM_PATH);
    expect(data.verified).toBe(false);
  });

  it("human output: prints path, address, public key, and verification state", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      ["signer", "tron", "address", "--output", "human"],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(stdout).toContain(`Path: ${DEFAULT_PATH}`);
    expect(stdout).toContain(`Address: ${TRON_ADDRESS.address}`);
    expect(stdout).toContain(`Public key: ${TRON_ADDRESS.publicKey}`);
    expect(stdout).toContain("Verified on device: true");
  });
});
