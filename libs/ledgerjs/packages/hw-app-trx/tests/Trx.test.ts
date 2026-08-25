import { openTransportReplayer, RecordStore } from "@ledgerhq/hw-transport-mocker";
import Trx from "../src/Trx";
import { decodeVarint } from "../src/utils";

test("getAppConfiguration", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e006000000
    <= 0f0001059000
    `),
  );
  const trx = new Trx(transport);
  const result = await trx.getAppConfiguration();
  expect(result).toEqual({
    allowData: true,
    allowContract: true,
    truncateAddress: true,
    signByHash: true,
    version: "0.1.5",
    versionN: 105,
  });
});

test("getAddress", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e002000015058000002c800000c3800000000000000000000000
    <= 41040357bda0e415396eab766d392d5b996eb4a0bec6ccbb166d581341ebb50ebb54c30b365823884d8169e4c784373f0d3b871f3d16bca0b33a292d98f6cf07855a225457646e57427a4664425031623873715a3552634644626b563373426d6e787359759000
    `),
  );
  const trx = new Trx(transport);
  const result = await trx.getAddress("44'/195'/0'/0/0");
  expect(result).toEqual({
    address: "TWdnWBzFdBP1b8sqZ5RcFDbkV3sBmnxsYu",
    publicKey:
      "040357bda0e415396eab766d392d5b996eb4a0bec6ccbb166d581341ebb50ebb54c30b365823884d8169e4c784373f0d3b871f3d16bca0b33a292d98f6cf07855a",
    chainCode: undefined,
  });
});

test("getAddress with chain code", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e002000115058000002c800000c3800000000000000000000000
    <= 41040357bda0e415396eab766d392d5b996eb4a0bec6ccbb166d581341ebb50ebb54c30b365823884d8169e4c784373f0d3b871f3d16bca0b33a292d98f6cf07855a225457646e57427a4664425031623873715a3552634644626b563373426d6e78735975040357bda0e415396eab766d392d5b996eb4a0bec6ccbb166d581341ebb50ebb9000
    `),
  );
  const trx = new Trx(transport);
  const result = await trx.getAddress("44'/195'/0'/0/0", false, true);
  expect(result).toEqual({
    address: "TWdnWBzFdBP1b8sqZ5RcFDbkV3sBmnxsYu",
    publicKey:
      "040357bda0e415396eab766d392d5b996eb4a0bec6ccbb166d581341ebb50ebb54c30b365823884d8169e4c784373f0d3b871f3d16bca0b33a292d98f6cf07855a",
    chainCode: "040357bda0e415396eab766d392d5b996eb4a0bec6ccbb166d581341ebb50ebb",
  });
});

test("signTransaction", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e0041000c9058000002c800000c38000000000000000000000000a023dce220895da42177db0050740d8e0a5feed2d522c43727970746f436861696e2d54726f6e5352204c6564676572205472616e73616374696f6e732054657374735a68080112640a2d747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e5472616e73666572436f6e747261637412330a1541c8599111f29c1e1e061265b4af93ea1f274ad78a121541c8599111f29c1e1e061265b4af93ea1f274ad78a1880c2d72f709d94a2feed2d
    <= 3816b17b81c0a528b9f7506029473c82a3931945999426550a18d788651cb59d2d674a2386501107af2d51a106a67f8cf2e6adf2aded3220b6d1fc9847aec7c0009000
    `),
  );
  const trx = new Trx(transport);
  const result = await trx.signTransaction(
    "44'/195'/0'/0/0",
    "0a023dce220895da42177db0050740d8e0a5feed2d522c43727970746f436861696e2d54726f6e5352204c6564676572205472616e73616374696f6e732054657374735a68080112640a2d747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e5472616e73666572436f6e747261637412330a1541c8599111f29c1e1e061265b4af93ea1f274ad78a121541c8599111f29c1e1e061265b4af93ea1f274ad78a1880c2d72f709d94a2feed2d",
    [],
  );
  expect(result).toEqual(
    "3816b17b81c0a528b9f7506029473c82a3931945999426550a18d788651cb59d2d674a2386501107af2d51a106a67f8cf2e6adf2aded3220b6d1fc9847aec7c000",
  );
});

it("should consume a transaction field when rolling over to a new chunk", async () => {
  const pathData = Buffer.from("058000002c800000c3800000000000000000000000", "hex");
  const firstField = Buffer.concat([Buffer.from("0ac801", "hex"), Buffer.alloc(200, 0xaa)]);
  const secondField = Buffer.concat([Buffer.from("121e", "hex"), Buffer.alloc(30, 0xbb)]);
  const firstCommand = Buffer.concat([
    Buffer.from("e0040000e0", "hex"),
    pathData,
    firstField,
  ]).toString("hex");
  const secondCommand = Buffer.concat([Buffer.from("e004900020", "hex"), secondField]).toString(
    "hex",
  );
  const signature = "00".repeat(65);
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => ${firstCommand}
    <= 9000
    => ${secondCommand}
    <= ${signature}9000
    `),
  );
  const trx = new Trx(transport);

  await expect(
    trx.signTransaction(
      "44'/195'/0'/0/0",
      Buffer.concat([firstField, secondField]).toString("hex"),
      [],
    ),
  ).resolves.toBe(signature);
});

it("should reject a malicious transaction length without sending to the device", async () => {
  const transport = await openTransportReplayer(RecordStore.fromString(""));
  const trx = new Trx(transport);

  await expect(
    Promise.resolve().then(() => trx.signTransaction("44'/195'/0'/0/0", "0a8080808008", [])),
  ).rejects.toThrow("Invalid transaction field length.");
});

it("should decode the malicious varint as a positive safe integer", () => {
  expect(decodeVarint(Buffer.from("8080808008", "hex"), 0)).toEqual({
    value: 2147483648,
    pos: 5,
  });
});

it("should reject a truncated transaction length varint", async () => {
  const transport = await openTransportReplayer(RecordStore.fromString(""));
  const trx = new Trx(transport);

  await expect(
    Promise.resolve().then(() => trx.signTransaction("44'/195'/0'/0/0", "0a80", [])),
  ).rejects.toThrow("Unexpected end of buffer when decoding varint.");
});

it("should reject a transaction field that exceeds the remaining bytes", async () => {
  const transport = await openTransportReplayer(RecordStore.fromString(""));
  const trx = new Trx(transport);

  await expect(
    Promise.resolve().then(() => trx.signTransaction("44'/195'/0'/0/0", "0a02ff", [])),
  ).rejects.toThrow("Invalid transaction field length.");
});

it("should preserve the encoded length of a maximum uint64 varint field", async () => {
  const transport = await openTransportReplayer(RecordStore.fromString(""));
  const trx = new Trx(transport);

  expect(trx.getNextLength(Buffer.from("08ffffffffffffffffff01", "hex"))).toBe(11);
});

test("signTransactionHash", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e005000035058000002c800000c3800000000000000000000000abfcd07e44a6bfc18efb18062c8e588c34f187e3d2b286d4411781acdf6692eb
    <= 37a3cce70ebf7d792222d93509475a28ef1c7709d9ba032bf01dff3e52bca98c5a6cf64b73428a3f412b7dab1504afe4ac11995049c27ecdf1b46493292e4c68019000
    `),
  );
  const trx = new Trx(transport);
  const result = await trx.signTransactionHash(
    "44'/195'/0'/0/0",
    "abfcd07e44a6bfc18efb18062c8e588c34f187e3d2b286d4411781acdf6692eb",
  );
  expect(result).toEqual(
    "37a3cce70ebf7d792222d93509475a28ef1c7709d9ba032bf01dff3e52bca98c5a6cf64b73428a3f412b7dab1504afe4ac11995049c27ecdf1b46493292e4c6801",
  );
});

test("signPersonalMessage", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e008000045058000002c800000c38000000000000000000000000000002c43727970746f436861696e2d54726f6e5352204c6564676572205472616e73616374696f6e73205465737473
    <= af4fb6500ff9058835b564d43078d5b201b71a3d3ead0d113baf68c86199f5ef1ee8f6ea48016a991e9d4bff410b8a77ba604850a03ac5f9cfd5fd95e25842fc019000
    `),
  );
  const trx = new Trx(transport);
  const result = await trx.signPersonalMessage(
    "44'/195'/0'/0/0",
    Buffer.from("CryptoChain-TronSR Ledger Transactions Tests").toString("hex"),
  );
  expect(result).toEqual(
    "af4fb6500ff9058835b564d43078d5b201b71a3d3ead0d113baf68c86199f5ef1ee8f6ea48016a991e9d4bff410b8a77ba604850a03ac5f9cfd5fd95e25842fc01",
  );
});

test("getSharedKey", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e00a000156058000002c800000c380000000000000000000000004e4e24db26e316049743d9149dc6878905d3e8633fb8c36e2cc63299e123d8a6b8fe5ada8c2c6364d94059c23afc8972de9d692b09674f677909bd5ff6d8d320b
    <= 04f3087b3d8f99fff119458a5e66f47a391af594e06e4f23e7849347125648a4c93369c0e4a5cce4aabec92f0abf90c94ca33cdeef905d848dfba5e12a8d77137a9000
    `),
  );
  const trx = new Trx(transport);
  const result = await trx.getECDHPairKey(
    "44'/195'/0'/0/0",
    "04e4e24db26e316049743d9149dc6878905d3e8633fb8c36e2cc63299e123d8a6b8fe5ada8c2c6364d94059c23afc8972de9d692b09674f677909bd5ff6d8d320b",
  );
  expect(result).toEqual(
    "04f3087b3d8f99fff119458a5e66f47a391af594e06e4f23e7849347125648a4c93369c0e4a5cce4aabec92f0abf90c94ca33cdeef905d848dfba5e12a8d77137a",
  );
});

test("signTIP712HashedMessage", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e00c000055058000002c800000c380000000000000000000000001010101010101010101010101010101010101010101010101010101010101010202020202020202020202020202020202020202020202020202020202020202
    <= 1c9b03dd6de5285ac5a648d7288f111e8aafc6ae36338e000130011f1eb68fbbe9760513d08cb2a582d96af3559e5c1185235e3a35b14f223751254659108a5f1a9000
    `),
  );
  const trx = new Trx(transport);
  const result = await trx.signTIP712HashedMessage(
    "44'/195'/0'/0/0",
    Buffer.from("0101010101010101010101010101010101010101010101010101010101010101", "hex").toString(
      "hex",
    ),
    Buffer.from("0202020202020202020202020202020202020202020202020202020202020202", "hex").toString(
      "hex",
    ),
  );
  expect(result).toEqual(
    "1c9b03dd6de5285ac5a648d7288f111e8aafc6ae36338e000130011f1eb68fbbe9760513d08cb2a582d96af3559e5c1185235e3a35b14f223751254659108a5f1a",
  );
});
