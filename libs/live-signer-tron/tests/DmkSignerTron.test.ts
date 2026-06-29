import { DeviceActionStatus, type DeviceManagementKit } from "@ledgerhq/device-management-kit";
import { LockedDeviceError, UserRefusedOnDevice } from "@ledgerhq/errors";
import { of, throwError } from "rxjs";
import { DmkSignerTron } from "../src/DmkSignerTron";
import type { TronSigner, TronSignerExtended } from "../src/types";

const mockSigner = {
  getAddress: jest.fn(),
  getAppConfiguration: jest.fn(),
  getECDHPairKey: jest.fn(),
  signMessage: jest.fn(),
  signTransaction: jest.fn(),
  signTransactionHash: jest.fn(),
  signTypedData: jest.fn(),
  signTypedDataHash: jest.fn(),
};
const mockWithContextModule = jest.fn();

jest.mock(
  "@ledgerhq/device-signer-kit-tron",
  () => ({
    SignerTronBuilder: jest.fn().mockImplementation(() => {
      const builder = {
        build: () => mockSigner,
        withContextModule: mockWithContextModule,
      };
      mockWithContextModule.mockReturnValue(builder);
      return builder;
    }),
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

  it("keeps bridge and extended signer APIs distinct", () => {
    const signer = new DmkSignerTron(dmk, "session-id");
    const bridgeSigner: TronSigner = signer;
    const extendedSigner: TronSignerExtended = signer;

    expect(bridgeSigner).toBe(signer);
    expect(extendedSigner).toBe(signer);
  });

  it("uses signer-tron default context module when no override is provided", () => {
    new DmkSignerTron(dmk, "session-id");

    expect(mockWithContextModule).not.toHaveBeenCalled();
  });

  it("passes custom context modules to signer-tron builder", () => {
    const contextModule = {
      getContexts: jest.fn(),
    };

    new DmkSignerTron(dmk, "session-id", { contextModule });

    expect(mockWithContextModule).toHaveBeenCalledWith(contextModule);
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

  it("gets app configuration through signer-tron", async () => {
    const appConfiguration = {
      version: "1.2.3",
      allowData: true,
      allowCustomContract: false,
      truncateAddress: true,
      signByHash: false,
      verboseTip712: true,
      displayHash: false,
    };
    mockSigner.getAppConfiguration.mockReturnValue({
      observable: of({
        status: DeviceActionStatus.Completed,
        output: appConfiguration,
      }),
    });

    const signer = new DmkSignerTron(dmk, "session-id");
    const result = await signer.getAppConfiguration();

    expect(mockSigner.getAppConfiguration).toHaveBeenCalledWith();
    expect(result).toBe(appConfiguration);
  });

  it("gets an ECDH pair key through signer-tron", async () => {
    const publicKey = new Uint8Array([1, 2, 3]);
    const pairKey = { secret: "secret" };
    mockSigner.getECDHPairKey.mockReturnValue({
      observable: of({
        status: DeviceActionStatus.Completed,
        output: pairKey,
      }),
    });

    const signer = new DmkSignerTron(dmk, "session-id");
    const result = await signer.getECDHPairKey("44'/195'/0'/0/0", publicKey);

    expect(mockSigner.getECDHPairKey).toHaveBeenCalledWith("44'/195'/0'/0/0", publicKey, {
      skipOpenApp: true,
    });
    expect(result).toBe(pairKey);
  });

  it("signs a transaction through the signer-tron public API", async () => {
    const rawData = new Uint8Array([1, 2, 3]);
    const contexts = [
      {
        type: "tronTrc10Token",
        payload: "aabbcc",
        tokenIndex: 0,
      },
    ];
    const signature = {
      r: `0x${"11".repeat(32)}`,
      s: `0x${"22".repeat(32)}`,
      v: 1,
    };
    mockSigner.signTransaction.mockReturnValue({
      observable: of({
        status: DeviceActionStatus.Completed,
        output: signature,
      }),
    });

    const signer = new DmkSignerTron(dmk, "session-id");
    const result = await signer.signTransaction("44'/195'/0'/0/0", rawData, {
      contexts,
    });

    expect(mockSigner.signTransaction).toHaveBeenCalledWith("44'/195'/0'/0/0", rawData, {
      contexts,
      skipOpenApp: true,
    });
    expect(result).toBe(signature);
  });

  it("signs a transaction hash through signer-tron", async () => {
    const hash = new Uint8Array(32).fill(1);
    const signature = {
      r: `0x${"11".repeat(32)}`,
      s: `0x${"22".repeat(32)}`,
      v: 1,
    };
    mockSigner.signTransactionHash.mockReturnValue({
      observable: of({
        status: DeviceActionStatus.Completed,
        output: signature,
      }),
    });

    const signer = new DmkSignerTron(dmk, "session-id");
    const result = await signer.signTransactionHash("44'/195'/0'/0/0", hash);

    expect(mockSigner.signTransactionHash).toHaveBeenCalledWith("44'/195'/0'/0/0", hash);
    expect(result).toBe(signature);
  });

  it("signs a message through signer-tron", async () => {
    const signature = {
      r: `0x${"11".repeat(32)}`,
      s: `0x${"22".repeat(32)}`,
      v: 1,
    };
    mockSigner.signMessage.mockReturnValue({
      observable: of({
        status: DeviceActionStatus.Completed,
        output: signature,
      }),
    });

    const signer = new DmkSignerTron(dmk, "session-id");
    const result = await signer.signMessage("44'/195'/0'/0/0", "hello", {
      fullDisplay: true,
    });

    expect(mockSigner.signMessage).toHaveBeenCalledWith("44'/195'/0'/0/0", "hello", {
      fullDisplay: true,
      skipOpenApp: true,
    });
    expect(result).toBe(signature);
  });

  it("signs typed data through signer-tron", async () => {
    const typedData = {
      domain: { name: "Ledger" },
      types: {
        Message: [{ name: "value", type: "string" }],
      },
      primaryType: "Message",
      message: { value: "hello" },
    };
    const signature = {
      r: `0x${"11".repeat(32)}`,
      s: `0x${"22".repeat(32)}`,
      v: 1,
    };
    mockSigner.signTypedData.mockReturnValue({
      observable: of({
        status: DeviceActionStatus.Completed,
        output: signature,
      }),
    });

    const signer = new DmkSignerTron(dmk, "session-id");
    const result = await signer.signTypedData("44'/195'/0'/0/0", typedData);

    expect(mockSigner.signTypedData).toHaveBeenCalledWith("44'/195'/0'/0/0", typedData, {
      skipOpenApp: true,
    });
    expect(result).toBe(signature);
  });

  it("signs typed data hashes through signer-tron", async () => {
    const domainHash = new Uint8Array(32).fill(1);
    const messageHash = new Uint8Array(32).fill(2);
    const signature = {
      r: `0x${"11".repeat(32)}`,
      s: `0x${"22".repeat(32)}`,
      v: 1,
    };
    mockSigner.signTypedDataHash.mockReturnValue({
      observable: of({
        status: DeviceActionStatus.Completed,
        output: signature,
      }),
    });

    const signer = new DmkSignerTron(dmk, "session-id");
    const result = await signer.signTypedDataHash("44'/195'/0'/0/0", domainHash, messageHash);

    expect(mockSigner.signTypedDataHash).toHaveBeenCalledWith(
      "44'/195'/0'/0/0",
      domainHash,
      messageHash,
    );
    expect(result).toBe(signature);
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
