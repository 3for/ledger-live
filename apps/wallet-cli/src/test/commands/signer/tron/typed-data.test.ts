import { beforeEach, describe, expect, it, mock } from "bun:test";
import { runCli } from "../../../helpers/cli-runner";

const DEFAULT_PATH = "44'/195'/0'/0/0";
const CUSTOM_PATH = "44'/195'/2'/0/0";
const TYPED_DATA = {
  domain: {
    name: "Ledger",
    version: "1",
    chainId: 1,
  },
  types: {
    Message: [{ name: "value", type: "string" }],
  },
  primaryType: "Message",
  message: {
    value: "hello",
  },
};
const OPTIONS = {
  skipOpenApp: true,
};
const SIGNATURE = {
  r: `0x${"11".repeat(32)}`,
  s: `0x${"22".repeat(32)}`,
  v: 1,
};

const signTypedDataMock = mock(async () => SIGNATURE);
const DmkSignerTronMock = mock(function DmkSignerTron() {
  return {
    signTypedData: signTypedDataMock,
  };
});

mock.module("@ledgerhq/live-signer-tron", () => ({
  DmkSignerTron: DmkSignerTronMock,
  LegacySignerTron: mock(function LegacySignerTron() {}),
}));

const MOCK_DMK_ENV = {
  WALLET_CLI_MOCK_DMK: "1",
};

describe("signer tron typed-data command (mock DMK)", () => {
  beforeEach(() => {
    DmkSignerTronMock.mockClear();
    signTypedDataMock.mockClear();
  });

  it("json output: signs TIP-712 typed data with the default Tron path", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "typed-data",
        "--typed-data",
        JSON.stringify(TYPED_DATA),
        "--output",
        "json",
      ],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(DmkSignerTronMock).toHaveBeenCalledTimes(1);
    expect(signTypedDataMock).toHaveBeenCalledWith(DEFAULT_PATH, TYPED_DATA, undefined);

    const data = JSON.parse(stdout);
    expect(data).toMatchObject({
      status: "success",
      command: "signer tron typed-data",
      network: "tron:main",
      path: DEFAULT_PATH,
      typedData: TYPED_DATA,
      options: {},
      signature: SIGNATURE,
    });
  });

  it("json output: supports positional typed data, custom path, and TypedDataOptions", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "typed-data",
        JSON.stringify(TYPED_DATA),
        "--path",
        CUSTOM_PATH,
        "--options",
        JSON.stringify(OPTIONS),
        "--output",
        "json",
      ],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(signTypedDataMock).toHaveBeenCalledWith(CUSTOM_PATH, TYPED_DATA, OPTIONS);

    const data = JSON.parse(stdout);
    expect(data.path).toBe(CUSTOM_PATH);
    expect(data.options).toEqual(OPTIONS);
  });

  it("human output: prints path, primary type, options, and signature fields", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "typed-data",
        "--typed-data",
        JSON.stringify(TYPED_DATA),
        "--options",
        JSON.stringify(OPTIONS),
        "--output",
        "human",
      ],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(stdout).toContain(`Path: ${DEFAULT_PATH}`);
    expect(stdout).toContain(`Primary type: ${TYPED_DATA.primaryType}`);
    expect(stdout).toContain(`Options: ${JSON.stringify(OPTIONS)}`);
    expect(stdout).toContain(`r: ${SIGNATURE.r}`);
    expect(stdout).toContain(`s: ${SIGNATURE.s}`);
    expect(stdout).toContain(`v: ${SIGNATURE.v}`);
  });

  it("returns an error when typed data is missing", async () => {
    const { stdout, exitCode } = await runCli(
      ["signer", "tron", "typed-data", "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout)).toMatchObject({
      ok: false,
      error: {
        command: "signer tron typed-data",
        message:
          "Missing typed data: use --typed-data <json> or pass it as the first positional argument.",
      },
    });
  });

  it("returns an error when typed data is not JSON", async () => {
    const { stdout, exitCode } = await runCli(
      ["signer", "tron", "typed-data", "--typed-data", "{", "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout)).toMatchObject({
      ok: false,
      error: {
        command: "signer tron typed-data",
        message: "Invalid typed data: expected JSON.",
      },
    });
  });
});
