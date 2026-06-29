import { beforeEach, describe, expect, it, mock } from "bun:test";
import { runCli } from "../../../helpers/cli-runner";

const DEFAULT_PATH = "44'/195'/0'/0/0";
const CUSTOM_PATH = "44'/195'/2'/0/0";
const HASH = `0x${"33".repeat(32)}`;
const HASH_BYTES = Buffer.from("33".repeat(32), "hex");
const SIGNATURE = {
  r: `0x${"11".repeat(32)}`,
  s: `0x${"22".repeat(32)}`,
  v: 1,
};

const signTransactionHashMock = mock(async () => SIGNATURE);
const DmkSignerTronMock = mock(function DmkSignerTron() {
  return {
    signTransactionHash: signTransactionHashMock,
  };
});

mock.module("@ledgerhq/live-signer-tron", () => ({
  DmkSignerTron: DmkSignerTronMock,
  LegacySignerTron: mock(function LegacySignerTron() {}),
}));

const MOCK_DMK_ENV = {
  WALLET_CLI_MOCK_DMK: "1",
};

describe("signer tron tx-hash command (mock DMK)", () => {
  beforeEach(() => {
    DmkSignerTronMock.mockClear();
    signTransactionHashMock.mockClear();
  });

  it("json output: signs a 32-byte transaction hash with the default Tron path", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      ["signer", "tron", "tx-hash", "--hash", HASH, "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(DmkSignerTronMock).toHaveBeenCalledTimes(1);
    expect(signTransactionHashMock).toHaveBeenCalledWith(DEFAULT_PATH, HASH_BYTES);

    const data = JSON.parse(stdout);
    expect(data).toMatchObject({
      status: "success",
      command: "signer tron tx-hash",
      network: "tron:main",
      path: DEFAULT_PATH,
      hash: HASH,
      signature: SIGNATURE,
    });
  });

  it("json output: supports positional bare hash and custom path", async () => {
    const bareHash = HASH.slice(2);
    const { stdout, stderr, exitCode } = await runCli(
      ["signer", "tron", "tx-hash", bareHash, "--path", CUSTOM_PATH, "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(signTransactionHashMock).toHaveBeenCalledWith(CUSTOM_PATH, HASH_BYTES);

    const data = JSON.parse(stdout);
    expect(data.path).toBe(CUSTOM_PATH);
    expect(data.hash).toBe(bareHash);
  });

  it("human output: prints path, hash, and signature fields", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      ["signer", "tron", "tx-hash", "--hash", HASH, "--output", "human"],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(stdout).toContain(`Path: ${DEFAULT_PATH}`);
    expect(stdout).toContain(`Hash: ${HASH}`);
    expect(stdout).toContain(`r: ${SIGNATURE.r}`);
    expect(stdout).toContain(`s: ${SIGNATURE.s}`);
    expect(stdout).toContain(`v: ${SIGNATURE.v}`);
  });

  it("returns an error when hash is missing", async () => {
    const { stdout, exitCode } = await runCli(
      ["signer", "tron", "tx-hash", "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout)).toMatchObject({
      ok: false,
      error: {
        command: "signer tron tx-hash",
        message:
          "Missing hash: use --hash <32-byte-hex> or pass it as the first positional argument.",
      },
    });
  });

  it("returns an error when hash is not 32 bytes", async () => {
    const { stdout, exitCode } = await runCli(
      ["signer", "tron", "tx-hash", "--hash", "0x1234", "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout)).toMatchObject({
      ok: false,
      error: {
        command: "signer tron tx-hash",
        message: "Invalid transaction hash: expected a 32-byte hex string.",
      },
    });
  });
});
