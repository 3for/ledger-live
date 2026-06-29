import { beforeEach, describe, expect, it, mock } from "bun:test";
import { runCli } from "../../../helpers/cli-runner";

const DEFAULT_PATH = "44'/195'/0'/0/0";
const CUSTOM_PATH = "44'/195'/2'/0/0";
const DOMAIN_HASH = `0x${"33".repeat(32)}`;
const MESSAGE_HASH = `0x${"44".repeat(32)}`;
const DOMAIN_HASH_BYTES = Buffer.from("33".repeat(32), "hex");
const MESSAGE_HASH_BYTES = Buffer.from("44".repeat(32), "hex");
const SIGNATURE = {
  r: `0x${"11".repeat(32)}`,
  s: `0x${"22".repeat(32)}`,
  v: 1,
};

const signTypedDataHashMock = mock(async () => SIGNATURE);
const DmkSignerTronMock = mock(function DmkSignerTron() {
  return {
    signTypedDataHash: signTypedDataHashMock,
  };
});

mock.module("@ledgerhq/live-signer-tron", () => ({
  DmkSignerTron: DmkSignerTronMock,
  LegacySignerTron: mock(function LegacySignerTron() {}),
}));

const MOCK_DMK_ENV = {
  WALLET_CLI_MOCK_DMK: "1",
};

describe("signer tron typed-data-hash command (mock DMK)", () => {
  beforeEach(() => {
    DmkSignerTronMock.mockClear();
    signTypedDataHashMock.mockClear();
  });

  it("json output: signs TIP-712 typed data hashes with the default Tron path", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "typed-data-hash",
        "--domain-hash",
        DOMAIN_HASH,
        "--message-hash",
        MESSAGE_HASH,
        "--output",
        "json",
      ],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(DmkSignerTronMock).toHaveBeenCalledTimes(1);
    expect(signTypedDataHashMock).toHaveBeenCalledWith(
      DEFAULT_PATH,
      DOMAIN_HASH_BYTES,
      MESSAGE_HASH_BYTES,
    );

    const data = JSON.parse(stdout);
    expect(data).toMatchObject({
      status: "success",
      command: "signer tron typed-data-hash",
      network: "tron:main",
      path: DEFAULT_PATH,
      domainHash: DOMAIN_HASH,
      messageHash: MESSAGE_HASH,
      signature: SIGNATURE,
    });
  });

  it("json output: supports positional bare hashes and custom path", async () => {
    const bareDomainHash = DOMAIN_HASH.slice(2);
    const bareMessageHash = MESSAGE_HASH.slice(2);
    const { stdout, stderr, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "typed-data-hash",
        bareDomainHash,
        bareMessageHash,
        "--path",
        CUSTOM_PATH,
        "--output",
        "json",
      ],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(signTypedDataHashMock).toHaveBeenCalledWith(
      CUSTOM_PATH,
      DOMAIN_HASH_BYTES,
      MESSAGE_HASH_BYTES,
    );

    const data = JSON.parse(stdout);
    expect(data.path).toBe(CUSTOM_PATH);
    expect(data.domainHash).toBe(bareDomainHash);
    expect(data.messageHash).toBe(bareMessageHash);
  });

  it("human output: prints path, hashes, and signature fields", async () => {
    const { stdout, stderr, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "typed-data-hash",
        "--domain-hash",
        DOMAIN_HASH,
        "--message-hash",
        MESSAGE_HASH,
        "--output",
        "human",
      ],
      MOCK_DMK_ENV,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(stdout).toContain(`Path: ${DEFAULT_PATH}`);
    expect(stdout).toContain(`Domain hash: ${DOMAIN_HASH}`);
    expect(stdout).toContain(`Message hash: ${MESSAGE_HASH}`);
    expect(stdout).toContain(`r: ${SIGNATURE.r}`);
    expect(stdout).toContain(`s: ${SIGNATURE.s}`);
    expect(stdout).toContain(`v: ${SIGNATURE.v}`);
  });

  it("returns an error when domain hash is missing", async () => {
    const { stdout, exitCode } = await runCli(
      ["signer", "tron", "typed-data-hash", "--output", "json"],
      MOCK_DMK_ENV,
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout)).toMatchObject({
      ok: false,
      error: {
        command: "signer tron typed-data-hash",
        message:
          "Missing domain-hash: use --domain-hash <32-byte-hex> or pass it as positional argument 1.",
      },
    });
  });

  it("returns an error when message hash is not 32 bytes", async () => {
    const { stdout, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "typed-data-hash",
        "--domain-hash",
        DOMAIN_HASH,
        "--message-hash",
        "0x1234",
        "--output",
        "json",
      ],
      MOCK_DMK_ENV,
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(stdout)).toMatchObject({
      ok: false,
      error: {
        command: "signer tron typed-data-hash",
        message: "Invalid message-hash: expected a 32-byte hex string.",
      },
    });
  });
});
