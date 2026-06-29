import { beforeEach, describe, expect, it, mock } from "bun:test";
import { runCli } from "../../../helpers/cli-runner";

const DEFAULT_PATH = "44'/195'/0'/0/0";
const CUSTOM_PATH = "44'/195'/2'/0/0";
const RAW_TX = "0a020102";
const RAW_TX_BYTES = Buffer.from(RAW_TX, "hex");
const CONTEXTS = [
  {
    type: "tronTrc10Token",
    payload: "aabbcc",
    tokenIndex: 0,
  },
];
const SIGNATURE = {
  r: `0x${"11".repeat(32)}`,
  s: `0x${"22".repeat(32)}`,
  v: 1,
};

const signTransactionMock = mock(async () => SIGNATURE);
const DmkSignerTronMock = mock(function DmkSignerTron() {
  return {
    signTransaction: signTransactionMock,
  };
});

mock.module("@ledgerhq/live-signer-tron", () => ({
  DmkSignerTron: DmkSignerTronMock,
  LegacySignerTron: mock(function LegacySignerTron() {}),
}));

const MOCK_DMK_ENV = {
  WALLET_CLI_MOCK_DMK: "1",
};

describe("signer tron tx command (mock DMK)", () => {
  beforeEach(() => {
    DmkSignerTronMock.mockClear();
    signTransactionMock.mockClear();
  });

  it("json output: signs a raw transaction with the default Tron path", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      ["signer", "tron", "tx", "--raw-tx", RAW_TX, "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(DmkSignerTronMock).toHaveBeenCalledTimes(1);
    expect(signTransactionMock).toHaveBeenCalledWith(DEFAULT_PATH, RAW_TX_BYTES, undefined);

    const data = JSON.parse(stdout);
    expect(data).toMatchObject({
      status: "success",
      command: "signer tron tx",
      network: "tron:main",
      path: DEFAULT_PATH,
      rawTx: RAW_TX,
      contexts: [],
      signature: SIGNATURE,
    });
  });

  it("json output: supports positional raw transaction, custom path, and contexts", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "tx",
        RAW_TX,
        "--path",
        CUSTOM_PATH,
        "--contexts",
        JSON.stringify(CONTEXTS),
        "--output",
        "json",
      ],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(signTransactionMock).toHaveBeenCalledWith(CUSTOM_PATH, RAW_TX_BYTES, {
      contexts: CONTEXTS,
    });

    const data = JSON.parse(stdout);
    expect(data.path).toBe(CUSTOM_PATH);
    expect(data.contexts).toEqual(CONTEXTS);
  });

  it("human output: prints path, raw transaction, contexts count, and signature fields", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "tx",
        "--raw-tx",
        RAW_TX,
        "--contexts",
        JSON.stringify(CONTEXTS),
        "--output",
        "human",
      ],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(stdout).toContain(`Path: ${DEFAULT_PATH}`);
    expect(stdout).toContain(`Raw transaction: ${RAW_TX}`);
    expect(stdout).toContain("Contexts: 1");
    expect(stdout).toContain(`r: ${SIGNATURE.r}`);
    expect(stdout).toContain(`s: ${SIGNATURE.s}`);
    expect(stdout).toContain(`v: ${SIGNATURE.v}`);
  });

  it("returns an error when raw transaction is missing", async () => {
    const { stdout, exitCode } = await runCli(
      ["signer", "tron", "tx", "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout)).toMatchObject({
      ok: false,
      error: {
        command: "signer tron tx",
        message:
          "Missing raw transaction: use --raw-tx <hex> or pass it as the first positional argument.",
      },
    });
  });

  it("returns an error when raw transaction is not even-length hex", async () => {
    const { stdout, exitCode } = await runCli(
      ["signer", "tron", "tx", "--raw-tx", "0x123", "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout)).toMatchObject({
      ok: false,
      error: {
        command: "signer tron tx",
        message: "Invalid raw transaction: expected an even-length hex string.",
      },
    });
  });

  it("returns an error when contexts is not a JSON array", async () => {
    const { stdout, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "tx",
        "--raw-tx",
        RAW_TX,
        "--contexts",
        '{"type":"tronTrc10Token"}',
        "--output",
        "json",
      ],
      MOCK_DMK_ENV,
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout)).toMatchObject({
      ok: false,
      error: {
        command: "signer tron tx",
        message: "Invalid contexts: expected a JSON array.",
      },
    });
  });

  it("maps TronAppCommandError to an actionable raw_data_hex error", async () => {
    signTransactionMock.mockImplementationOnce(async () => {
      throw new Error("TronAppCommandError");
    });

    const { stdout, exitCode } = await runCli(
      ["signer", "tron", "tx", "--raw-tx", RAW_TX, "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout)).toMatchObject({
      ok: false,
      error: {
        command: "signer tron tx",
        message:
          "Tron app rejected the raw transaction. Pass a valid Tron raw_data_hex generated for this account; arbitrary bytes are not signable.",
      },
    });
  });
});
