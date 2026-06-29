import { beforeEach, describe, expect, it, mock } from "bun:test";
import { runCli } from "../../../helpers/cli-runner";

const DEFAULT_PATH = "44'/195'/0'/0/0";
const CUSTOM_PATH = "44'/195'/1'/0/0";
const MESSAGE = "hello tron";
const SIGNATURE = {
  r: `0x${"11".repeat(32)}`,
  s: `0x${"22".repeat(32)}`,
  v: 1,
};

const signMessageMock = mock(async () => SIGNATURE);
const DmkSignerTronMock = mock(function DmkSignerTron() {
  return {
    signMessage: signMessageMock,
  };
});

mock.module("@ledgerhq/live-signer-tron", () => ({
  DmkSignerTron: DmkSignerTronMock,
  LegacySignerTron: mock(function LegacySignerTron() {}),
}));

const MOCK_DMK_ENV = {
  WALLET_CLI_MOCK_DMK: "1",
};

describe("signer tron message command (mock DMK)", () => {
  beforeEach(() => {
    DmkSignerTronMock.mockClear();
    signMessageMock.mockClear();
  });

  it("json output: signs a message with the default Tron path", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      ["signer", "tron", "message", "--message", MESSAGE, "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(DmkSignerTronMock).toHaveBeenCalledTimes(1);
    expect(signMessageMock).toHaveBeenCalledWith(DEFAULT_PATH, MESSAGE, {
      fullDisplay: true,
    });

    const data = JSON.parse(stdout);
    expect(data).toMatchObject({
      status: "success",
      command: "signer tron message",
      network: "tron:main",
      path: DEFAULT_PATH,
      message: MESSAGE,
      signature: SIGNATURE,
    });
  });

  it("json output: supports positional message, custom path, and --no-full-display", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "message",
        MESSAGE,
        "--path",
        CUSTOM_PATH,
        "--no-full-display",
        "--output",
        "json",
      ],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(signMessageMock).toHaveBeenCalledWith(CUSTOM_PATH, MESSAGE, {
      fullDisplay: false,
    });

    const data = JSON.parse(stdout);
    expect(data.path).toBe(CUSTOM_PATH);
    expect(data.message).toBe(MESSAGE);
  });

  it("human output: prints path, message, and signature fields", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      ["signer", "tron", "message", "--message", MESSAGE, "--output", "human"],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(stdout).toContain(`Path: ${DEFAULT_PATH}`);
    expect(stdout).toContain(`Message: ${MESSAGE}`);
    expect(stdout).toContain(`r: ${SIGNATURE.r}`);
    expect(stdout).toContain(`s: ${SIGNATURE.s}`);
    expect(stdout).toContain(`v: ${SIGNATURE.v}`);
  });

  it("returns an error when message is missing", async () => {
    const { stdout, exitCode } = await runCli(
      ["signer", "tron", "message", "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout)).toMatchObject({
      ok: false,
      error: {
        command: "signer tron message",
        message:
          "Missing message: use --message <text> or pass it as the first positional argument.",
      },
    });
  });
});
