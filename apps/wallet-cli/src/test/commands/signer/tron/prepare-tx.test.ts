import { beforeEach, describe, expect, it, mock } from "bun:test";
import { runCli } from "../../../helpers/cli-runner";
import { makeSessionDir } from "../../../helpers/session-fixture";

const TRON_ADDRESS = "TFMA7iav1S9K46K2QaSKL5PV73qk4LcEcZ";
const TRON_DESCRIPTOR = `account:1:address:tron:main:${TRON_ADDRESS}:m/44h/195h/0h/0/0`;
const PREPARED = {
  recipient: "TCHDNLWN2mjbPkpKXCm4UwmwwHKWZoWpDy",
  amount: "1 TRX",
  fees: "0 TRX",
  rawDataHex: "0a020102",
};

const prepareTronSendMock = mock(async () => PREPARED);
const WalletAdapterMock = mock(function WalletAdapter() {
  return {
    prepareTronSend: prepareTronSendMock,
  };
});

mock.module("../../../../wallet", () => ({
  WalletAdapter: WalletAdapterMock,
}));

describe("signer tron prepare-tx command", () => {
  let sessionCleanup: (() => void) | undefined;

  beforeEach(() => {
    WalletAdapterMock.mockClear();
    prepareTronSendMock.mockClear();
    sessionCleanup?.();
    sessionCleanup = undefined;
  });

  it("json output: prepares unsigned raw_data_hex for a Tron send", async () => {
    const fixture = makeSessionDir([{ label: "tron-1", descriptor: TRON_DESCRIPTOR }]);
    sessionCleanup = fixture.cleanup;

    const { stdout, stderr, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "prepare-tx",
        "--account",
        "tron-1",
        "--to",
        PREPARED.recipient,
        "--amount",
        "1 TRX",
        "--output",
        "json",
      ],
      fixture.env,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(WalletAdapterMock).toHaveBeenCalledTimes(1);
    expect(prepareTronSendMock).toHaveBeenCalledTimes(1);
    const prepareTronSendCall = prepareTronSendMock.mock.calls[0] as unknown[] | undefined;
    expect(prepareTronSendCall?.[1]).toEqual({
      family: "tron",
      recipient: PREPARED.recipient,
      amount: "1 TRX",
    });

    const data = JSON.parse(stdout);
    expect(data).toMatchObject({
      status: "success",
      command: "signer tron prepare-tx",
      network: "tron:main",
      account: TRON_DESCRIPTOR,
      path: "44'/195'/0'/0/0",
      recipient: PREPARED.recipient,
      amount: PREPARED.amount,
      fee: PREPARED.fees,
      rawDataHex: PREPARED.rawDataHex,
    });
  });

  it("human output: prints path, summary, and raw_data_hex", async () => {
    const fixture = makeSessionDir([{ label: "tron-1", descriptor: TRON_DESCRIPTOR }]);
    sessionCleanup = fixture.cleanup;

    const { stdout, stderr, exitCode } = await runCli(
      [
        "signer",
        "tron",
        "prepare-tx",
        "tron-1",
        "--to",
        PREPARED.recipient,
        "--amount",
        "1 TRX",
        "--output",
        "human",
      ],
      fixture.env,
    );

    expect(exitCode, `stderr: ${stderr}`).toBe(0);
    expect(stdout).toContain("Path: 44'/195'/0'/0/0");
    expect(stdout).toContain(`To: ${PREPARED.recipient}`);
    expect(stdout).toContain(`Amount: ${PREPARED.amount}`);
    expect(stdout).toContain(`Fees: ${PREPARED.fees}`);
    expect(stdout).toContain(`raw_data_hex: ${PREPARED.rawDataHex}`);
  });
});
