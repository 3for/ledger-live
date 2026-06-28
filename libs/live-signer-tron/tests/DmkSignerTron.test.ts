import { DeviceActionStatus, type DeviceManagementKit } from "@ledgerhq/device-management-kit";
import { LockedDeviceError, UserRefusedOnDevice } from "@ledgerhq/errors";
import { of, throwError } from "rxjs";
import { DmkSignerTron } from "../src/DmkSignerTron";

const mockSigner = {
  getAddress: jest.fn(),
  signTransaction: jest.fn(),
};

jest.mock(
  "@ledgerhq/device-signer-kit-tron",
  () => ({
    SignerTronBuilder: jest.fn().mockImplementation(() => ({
      build: () => mockSigner,
    })),
    TronClearSignContextType: {
      TRC10_TOKEN: "tronTrc10Token",
    },
  }),
  { virtual: true },
);

describe("DmkSignerTron", () => {
  const dmk = {} as DeviceManagementKit;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gets an address through signer-tron", async () => {
    mockSigner.getAddress.mockReturnValue({
      observable: of({
        status: DeviceActionStatus.Completed,
        output: {
          publicKey: "public-key",
          address: "address",
        },
      }),
    });

    const signer = new DmkSignerTron(dmk, "session-id");
    const result = await signer.getAddress("44'/195'/0'/0/0", true);

    expect(mockSigner.getAddress).toHaveBeenCalledWith("44'/195'/0'/0/0", {
      checkOnDevice: true,
      skipOpenApp: true,
    });
    expect(result).toEqual({
      publicKey: "public-key",
      address: "address",
    });
  });

  it("signs a transaction and maps TRC10 token signatures to signer-tron contexts", async () => {
    mockSigner.signTransaction.mockReturnValue({
      observable: of({
        status: DeviceActionStatus.Completed,
        output: {
          r: `0x${"11".repeat(32)}`,
          s: `0x${"22".repeat(32)}`,
          v: 1,
        },
      }),
    });

    const signer = new DmkSignerTron(dmk, "session-id");
    const result = await signer.sign("44'/195'/0'/0/0", "010203", ["aabbcc"]);

    expect(mockSigner.signTransaction).toHaveBeenCalledWith(
      "44'/195'/0'/0/0",
      Buffer.from("010203", "hex"),
      {
        skipOpenApp: true,
        contexts: [
          {
            type: "tronTrc10Token",
            payload: "aabbcc",
            tokenIndex: 0,
          },
        ],
      },
    );
    expect(result).toBe(`${"11".repeat(32)}${"22".repeat(32)}01`);
  });

  it.each([
    ["5515", LockedDeviceError],
    ["6982", UserRefusedOnDevice],
    ["6985", UserRefusedOnDevice],
  ])("maps signer-tron error code %s", async (errorCode, ErrorClass) => {
    mockSigner.signTransaction.mockReturnValue({
      observable: of({
        status: DeviceActionStatus.Error,
        error: {
          _tag: "SignTransactionDAError",
          errorCode,
        },
      }),
    });

    const signer = new DmkSignerTron(dmk, "session-id");

    await expect(signer.sign("44'/195'/0'/0/0", "010203", [])).rejects.toThrow(ErrorClass);
  });

  it("rejects observable errors", async () => {
    mockSigner.getAddress.mockReturnValue({
      observable: throwError(() => new Error("transport error")),
    });

    const signer = new DmkSignerTron(dmk, "session-id");

    await expect(signer.getAddress("44'/195'/0'/0/0")).rejects.toThrow("transport error");
  });
});
