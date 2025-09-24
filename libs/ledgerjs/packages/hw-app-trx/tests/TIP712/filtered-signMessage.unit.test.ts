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
    1: "AAAAZwRVU0RDoLhpkcYhizbB0Z1KLp6wzjYG60gAAAAGAAAAATBEAiBT0S5lTL5ipustFl3sP7dsPLF2QWaAyaXg3iWQsLnNigIgUEdqFpFVhGEAxiwzjHZ5FC0GD/VU92W8nBjTHrsy42AAAABoBFdFVEjAKqo5siP+jQoOXE8n6tkIPHVswgAAABIAAAABMEUCIQDGNSQY0A9zJrjwtmxxxdCfMG4OzgBJPLqeqOoXe0pI7QIgZGYxocaD2s6sFSA355FC7owyjNN8g6eOy4BeE44/Ovc=",
    137: "AAAAZwRVU0RDJ5G8ofLeRmHtiKMMmaepRJqoQXQAAAAGAAAAiTBEAiBjxSGrC/C4mPSUtg6cVMGpgokwZmVNpdnc0rkfhL2c1gIgD+CqcDL9MWCffzbolbi1oWATL/5P3F1YWPvrLGaLG00AAABnBFdFVEh86yP9a8Ct1Z5irCVXgnDP8bn2GQAAABIAAACJMEQCIFBR0vbDO+KtsBq864UEM6P8+6U9jtZ80MCzRJi9MCpsAiAiSy+Re8z4tNPMwJh778qv04NadWUdQK8kfzY2EkC+WgAAAGkGV01BVElDDVALHY6O8x4hyZ0duaZETTrfEnAAAAASAAAAiTBEAiAzUzhabCGosL5APk2DKlMgGkrJxI8WmHeZ0xNKbrSHGQIgQIeT1ugsoIZD7J/5HZf6WmJ9yG/CRdvi88LrccoM9Bc=",
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
        "cae163eef24a9ca43879307d7adbfed4102d65920dcf074cb2290e4d70f2a7e004d4442eb37501f22d065dc9399d82440f8f38258e626e9b168deac3d29eeb6e00",
      );
    });

    it("should sign correctly the 1.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "1-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "1"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "14aeba202e808892b8b41346ea48215173ff72333b4fa519b3776507354645a42875fc4c5b2bf890c1ed73b04e3a1a6cfe3d97f3ddd363bb9ad62e2ffe64815b00",
      );
    });

    it("should sign correctly the 2.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "2-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "2"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "8d3cc12185d93d0fa9be87fd4015dd5c6ed860cd54e834c0d53abbe45b9bba337568b47bacb4af6a80583ed70d61bf08f9d52462b6a24f30624cc33e9dffcd3500",
      );
    });

    it("should sign correctly the 3.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "3-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "3"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "9282c1ceb7b86801c17aed19a750d771ae6d064f1c6e0796b2e7ac5f8b29ade526916e236cb2bae5c7475b2f206089034dd3520dc1bca7486ca7aca3511e6fe301",
      );
    });

    it("should sign correctly the 4.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "4-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "4"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "72c335c292b5593dadaed7c5a826cd355d8b8080c31fca5788f1ed64eed2336b719093c83744fa485f36d0309cad0d3221307102f352718ef5ebd85f1f9e68ba00",
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
        "8b490eb60afabb7224790036dddbf1ab9e6eabc1a28a45ff16055e11eee29d852cc60cc634bbb2615041b0f56e9b66c4736915bd0cb6ab46cd00752e73b49b0b00",
      );
    });

    it("should sign correctly the 7.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "7-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "7"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "fec8b82001230fa8c8e809fe390463c4e6150c1fe205150b8d1411abdedae01375071f74f3d493aeb5246f1e5cf956e226519a0336d69c0db91055e463fe2b4601",
      );
    });

    it("should sign correctly the 8.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "8-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "8"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "0f6707a7c997ef97c9442c489df117a0e274036a9ca6f23bae0d51ff5dd36fdb59b56b1b2726f68d187b2aa5ba68d16071f69af52f84f83b3adf8f5853ea78af00",
      );
    });

    it("should sign correctly the 9.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "9-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "9"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "db49a16079d210ac543d2f15015ce91b0b77b32e144ec71fb1b9159d38148cbb0f5451b0412458bb3181301acb9418716b7d32f097f046cbf503867cefe8381300",
      );
    });

    it("should sign correctly the 10.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "10-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "10"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "b16cb6981349ddb88a869aea4a4e3633794457cfecadd4a29e152ea284c5fafd792a2c7be51a9f5d5c6411fa6f4b5cf4582b6add95c07a842349e79d995bfc7101",
      );
    });

    it("should sign correctly the 11.json sample message", async () => {
      const apdusBuffer = await fs.readFile(getFilePath("apdu", "11-filtered-v2"), "utf-8");
      const message = await fs.readFile(getFilePath("message", "11"), "utf-8").then(JSON.parse);

      const transport = await openTransportReplayer(RecordStore.fromString(apdusBuffer));

      const appTron = new Trx(transport);
      const result = await appTron.signTIP712Message("44'/195'/0'/0/0", message);

      expect(result).toEqual(
        "97007e9d4b0a5ca1af8290516b3d30ffdfa178f0aa77b991182c972595a12c3e3bee63e69cc1af6f1b75e228be3737c6a43b2145b324f4269209e81455d8f91c00",
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
        "6911b84ff5820dc12ea1568762be1beab9e7517c380285a13643ae1cbfa11a39000aa57216a5a2b7dc57effd4b1002a3027ea35b69a0a9a735c347acaaf3a32401",
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
        "5945f8c733edf1d5b567f86e40e8d253dcd1407e80d41740fd5061f48ce415990dc67b63e3abcf18524dca2d86985e51af0ad8854859d65e79b24a4b03f4f4d601",
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
        "420e59f280c328f0491ccece62314a89aa38cad6ef9042d437efadf45728956c2ea292747c346b9560dec28ab8ac39c01e8695a4ae7647d43841a4370193f84c00",
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
        "f94218b6059c20ecf76332d844977effa40e3207ddd5ea4c26cf277f216960476ac4d94671cb22c9ebd7d78ba293cfd3c9ba818528ab00bd907197fe434239f601",
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
        "f08c6243c3317819be9d774f2f356576628bb2e1d6cf551f30365de4c9b3816a1a3cb231fd6c18c7cb96d367442aaec16c2b69fa2dc0e66a4b26400a7f40d5b300",
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
        "7c9217f7b3f60dc4ff30eb10a7f9bdd437ffb608373459b66c638075d35e8a1212830f295da7b49362b92816029b3605006a1f8b11fe9b1ccf47610de47e17bb01",
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
        "863d473b15005215f4db06229638eece4e1a5c1473e6bad2dcea440639d8bfdd765db0b3a712b35ff319fc8d6b48124f7c463fa37e2ae4bc6440c84878e5ff4001",
      );
    });
  });
});
