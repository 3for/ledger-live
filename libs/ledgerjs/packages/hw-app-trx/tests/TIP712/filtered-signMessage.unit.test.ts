import path from "path";
import nock from "nock";
import fs from "fs/promises";
import { openTransportReplayer, RecordStore } from "@ledgerhq/hw-transport-mocker";
import { v2 } from "../fixtures/CAL";
import Trx from "../../src/Trx";

const getFilePath = (type: "apdu" | "message", filename: string): string => {
  switch (type) {
    case "apdu":
      return path.resolve(`./tests/fixtures/apdus/${filename}.apdus`);
    case "message":
      return path.resolve(`./tests/fixtures/messages/${filename}-data.json`);
  }
};

jest.mock("../../src/TIP712/tip712", () => v2);
jest.mock("@ledgerhq/cryptoassets-evm-signatures/data/evm/index", () => ({
  signatures: {
    1151668124:
      "AAAAZwRVU0RDoLhpkcYhizbB0Z1KLp6wzjYG60gAAAAGRKUPnDBEAiAIWz/ey1U9VsE2YoaNFpBg2BAsJYtdpejXLnchcMmqigIgeiJCS3JffAcdSseApOpd+KUQaj1g2N2cBwFUOoSTLqEAAABoBFdFVEh86yP9a8Ct1Z5irCVXgnDP8bn2GQAAABJEpQ+cMEUCIETSV05QNUQvardKpAnUteYCp4ujKOrrh+rF+z0N6/btAiEA9rDSNGSvMWxGC12GmgXPU9uUjvX/T+lo/b4Dwh0tiM0AAABpBFdFVEjAKqo5siP+jQoOXE8n6tkIPHVswgAAABJEpQ+cMEYCIQDbLNAWiikH6lIUY+QcDIQJL0aGZXGPYnHhkz3grhksLgIhALc8PMzDLSRFrFfNJBeMiuHOw+iCyI1VJKhRqf/8w+A+AAAAaQRVU0RDJ5G8ofLeRmHtiKMMmaepRJqoQXQAAAAGRKUPnDBGAiEAl0VDzoM13T2J44RRleOXMpBXzr5OKeMnsj1jxoCMwsgCIQDmeNY4R+0j8HHw0z+KSk0ah2W2zHiTjQ8vSKBuj0ENIQAAAGoGV01BVElDDVALHY6O8x4hyZ0duaZETTrfEnAAAAASRKUPnDBFAiEAlxQha6vDbPw1GLaxE0iWDiAwiG4rs5p0hnLntIPvnsgCIAtrJS6+MxDs1YzD0mUyQxlUhWrFr69Q2JGidsAqI3/G",
  },
}));
nock.disableNetConnect();

describe("TIP712", () => {
  describe("SignTIP712Message with filters v2", () => {
    it("should sign correctly the 0.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "0-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "0"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "a85d3b016d033beb9c9f5b47139053a27c71a7052c467419cc3684af18ef4a9e673a9d33a98db8d513ae1de429627a026068187bf92f935c50194c60e4a3dcfe01",
      );
    });

    it("should sign correctly the 1.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "1-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "1"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "64805db522cda98d51482f3cdf8c6d7daba5b76407263c2e44c8bc22fe652acb20e5b92a4dbd1917e4a6183deab1d65bf6ecec04c5cb3ea6d92872697249afc800",
      );
    });

    it("should sign correctly the 2.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "2-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "2"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "8514144c8086a4158a44fd048c84730126d70eda67769d919bae251919a9df6948a7aaef0e05d5d77cf98211a0fcbe2ddc75120df0ded3997c88419d94f1772301",
      );
    });

    it("should sign correctly the 3.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "3-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "3"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "c317ec900a9fa6e6492abcf37fc22c2e1321c61bf6b8c5212e633c29ffd0f43e568a687152244c5a3038dd45800bb5f5315885a1d8cb5732ad728eb0d422fe3701",
      );
    });

    it("should sign correctly the 4.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "4-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "4"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "049018071e276dcc4c33325053806c7a0999fad6ac4fc7bfd57f3439dc8da6ca128809af1e51c651b38196d21dfd00f3e98f69b8169b74bf4c1bf9d1f00f0d1201",
      );
    });

    it("should sign correctly the 5.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "5-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "5"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "d65be2e566fb410e11167a4c1e047acb709a8b4e53ca8d65766daa47bf2245927a7fc871c3c3688c38e4b827cb2b58d1b2224d13b3eadbeee4c8cec2b3f4a6fb00",
      );
    });

    it("should sign correctly the 6.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "6-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "6"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "f8f96d3b7881cf7c6f34a25646e50ae77ddfceace7230a89eaba7ba9d7521cdf06b0fe4694307c111ee7ae5f16f0ca22310ded3da800dee75be6e89f42c07f0f01",
      );
    });

    it("should sign correctly the 7.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "7-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "7"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "0019f4eced0097e84d78a6e234d69ee1f0f2648e55d643d78e2cffd51b40aced084c85269398e3d1383f3606882dba18f5675023d405847eff90faec51ecd50e00",
      );
    });

    it("should sign correctly the 8.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "8-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "8"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "7ecfb3545d494e76fa8adcb72901a1a85f60a8b6f9290f6f8b72eda2b1c3d2f54e1e59e39529337871fae7305d9f1e39ea1f9efa26a7be6642d2ea098f6cf86000",
      );
    });

    it("should sign correctly the 9.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "9-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "9"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "b927993dc9310fede16f89e439d8be222f3d6cd3bef4610910a2ce3ea3ccca3e595de36771c2ba1ae8f8c00baac4cc414e1929622c91b4e60892b66309726f0c01",
      );
    });

    it("should sign correctly the 10.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "10-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "10"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "841f3eb8828381b7234ce57d82f9bc5e6688f950ead94670cb6d9da1c92d11481ae654dbc3d4996cb00de241d854ec84d5b81f558b5779184c5fc7912048893d00",
      );
    });

    it("should sign correctly the 11.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "11-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "11"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "857bbae72082d0128d0a5b4d02e2a3121d83f11a9740ea20b98699d27cb8f8dd7b819efa14660da4bd0a3123eccd709ad370f1e54737ec48467aadc9ebc0a0c501",
      );
    });

    it("should sign correctly the 12.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "12-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "12"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "13fa762998b0f7d157327f60d9921dfa8302e134234d9d19809bf00add3bdeed69c63b9f4b84b8e7a5082c65ee2c356b803606390da9d8bac17c470c82c542b200",
      );
    });

    it("should sign correctly the 13.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "13-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "13"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "0b10470d4f630197cfd803e94140c4fe3570c50f93217c6df6e197766c87ee8741b3e8ad278b87e6c2a6db87705ffb155a2a403564eccbeb3202e2a949a602eb00",
      );
    });

    it("should sign correctly the 14.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "14-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "14"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "700ae399b2b809c76a7ea2a634817647611743746c1e4c42d2016a90bee3ca820e077cd7643361c429588f6d9d8cfb379579d8c347e5a65806ee2e918e4ceb6d00",
      );
    });

    it("should sign correctly the 14bis.json sample message and have the same APDUs as 14.json", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "14-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "14bis"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "700ae399b2b809c76a7ea2a634817647611743746c1e4c42d2016a90bee3ca820e077cd7643361c429588f6d9d8cfb379579d8c347e5a65806ee2e918e4ceb6d00",
      );
    });

    it("should sign correctly the 15-permit.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "15-filtered-v2"), "utf-8");
      const message = await fs
        .readFile(getFilePath("message", "15-permit"), "utf-8")
        .then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "a5a6b76a5c96ae931c4bdd011d40e834f3c19b4078177c113b38e6acb93840eb7422cb8973e26f8dfe9cefe679aedf5d240375ea2b89e01ae75dcb9b23a5f8c901",
      );
    });

    it("should sign correctly the 16-permit2.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "16-filtered-v2"), "utf-8");
      const message = await fs
        .readFile(getFilePath("message", "16-permit2"), "utf-8")
        .then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "8a1f1cb42d309e304b02e492907f49de0f3bbfda350ff85edddd184f1270b92e5edc459f5da0163af7330244122cec940d4ce20febc4ad8353e53dc061aaece500",
      );
    });

    it("should sign correctly the 17-uniswapx.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "17-filtered-v2"), "utf-8");
      const message = await fs
        .readFile(getFilePath("message", "17-uniswapx"), "utf-8")
        .then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "b238e43daf0cd3af3bc9dcf0386d3cad1e33a8f7959a43d4e99fe5a46b978fa43864c50f9bafb561ed5fa3396a4fdaf3e99fb5493e1242f5c0a6470ecd4af67000",
      );
    });

    it("should sign correctly the 18-1inch-fusion.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "18-filtered-v2"), "utf-8");
      const message = await fs
        .readFile(getFilePath("message", "18-1inch-fusion"), "utf-8")
        .then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "193b5608541e5d4d751c48c3a13ee9b97bd399f61b640eab142e456aff5f97a2666bb8446a15d5ece1ae50f112e1b369f7ba63c953139a34d23fe041891354cf01",
      );
    });
    it("should sign correctly the 1-empty-array-1-level.json sample message", async () => {
      const apdusBuffer = await fs.readFile(
        getFilePath("apdu", "1-filtered-empty-array-1-level-v2"),
        "utf-8",
      );
      const message = await fs
        .readFile(getFilePath("message", "1-empty-array-1-level"), "utf-8")
        .then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "e657d5d3419e0c29901d149c91331967f24fd326526164be3a61ff9f92e9a979516ed54623caac29c097e7319b2ad99384bf543651051a9414b4aca16c7c3bae00",
      );
    });

    it("should sign correctly the 1-empty-array-2-levels.json sample message", async () => {
      const apdusBuffer = await fs.readFile(
        getFilePath("apdu", "1-filtered-empty-array-2-levels-v2"),
        "utf-8",
      );
      const message = await fs
        .readFile(getFilePath("message", "1-empty-array-2-levels"), "utf-8")
        .then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "e60100c407e2020a9de681c3caa80fd927bea2a29cfb18a8acab5992b5c85b7e309c06c868282dd501394aaaf31aa004bf128d85068c0694ff38710ab32c8e1600",
      );
    });
  });
});
