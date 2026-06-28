describe("LegacySignerTron", () => {
  const transport = {} as never;
  const getAddress = jest.fn();
  const signTransaction = jest.fn();
  const Trx = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.doMock("@ledgerhq/hw-app-trx", () => ({
      __esModule: true,
      default: Trx,
    }));
    Trx.mockImplementation(
      () =>
        ({
          getAddress,
          signTransaction,
        }) as never,
    );
  });

  afterEach(() => {
    jest.dontMock("@ledgerhq/hw-app-trx");
    jest.resetModules();
  });

  it("forwards getAddress to hw-app-trx", async () => {
    const { LegacySignerTron } = await import("../src/LegacySignerTron");
    getAddress.mockResolvedValue({
      publicKey: "public-key",
      address: "address",
    });

    const signer = new LegacySignerTron(transport);
    const result = await signer.getAddress("44'/195'/0'/0/0", true);

    expect(Trx).toHaveBeenCalledWith(transport);
    expect(getAddress).toHaveBeenCalledWith("44'/195'/0'/0/0", true);
    expect(result).toEqual({
      publicKey: "public-key",
      address: "address",
    });
  });

  it("forwards sign to hw-app-trx signTransaction", async () => {
    const { LegacySignerTron } = await import("../src/LegacySignerTron");
    signTransaction.mockResolvedValue("signature");

    const signer = new LegacySignerTron(transport);
    const result = await signer.sign("44'/195'/0'/0/0", "010203", ["aabb"]);

    expect(signTransaction).toHaveBeenCalledWith("44'/195'/0'/0/0", "010203", ["aabb"]);
    expect(result).toBe("signature");
  });
});
