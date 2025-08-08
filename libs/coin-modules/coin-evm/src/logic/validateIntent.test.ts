import { CryptoCurrency } from "@ledgerhq/types-cryptoassets";
import {
  AmountRequired,
  ETHAddressNonEIP,
  InvalidAddress,
  NotEnoughBalance,
  RecipientRequired,
} from "@ledgerhq/errors";
import { TransactionIntent } from "@ledgerhq/coin-framework/api/types";
import BigNumber from "bignumber.js";
import { Operation } from "@ledgerhq/types-live";
import { EvmCoinConfig, setCoinConfig } from "../config";
import ledgerNode from "../network/node/ledger";
import ledgerExplorer from "../network/explorer/ledger";
import { validateIntent } from "./validateIntent";

function eip1559Intent(intent: Omit<Partial<TransactionIntent>, "type">): TransactionIntent {
  return {
    type: "send-eip1559",
    sender: "",
    recipient: "",
    amount: 0n,
    asset: { type: "native" },
    ...intent,
  };
}

describe("validateIntent", () => {
  beforeEach(() => {
    setCoinConfig(
      () =>
        ({
          info: { node: { type: "ledger" }, explorer: { type: "ledger" } },
        }) as unknown as EvmCoinConfig,
    );

    jest.spyOn(ledgerNode, "getGasEstimation").mockResolvedValue(new BigNumber(0));
    jest.spyOn(ledgerNode, "getFeeData").mockResolvedValue({
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasPrice: null,
      nextBaseFee: null,
    });
    jest.spyOn(ledgerExplorer, "getLastOperations").mockResolvedValue({
      lastCoinOperations: [],
      lastInternalOperations: [],
      lastNftOperations: [],
      lastTokenOperations: [],
    });
    jest.spyOn(ledgerNode, "getCoinBalance").mockResolvedValue(new BigNumber(50));
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("recipient", () => {
    it("detects the missing recipient with an error", async () => {
      const res = await validateIntent(
        {} as CryptoCurrency,
        eip1559Intent({ amount: 1n, recipient: "" }),
      );

      expect(res.errors).toEqual({
        recipient: new RecipientRequired(),
      });
    });

    it("detects the incorrect recipient not being an eth address with an error", async () => {
      const res = await validateIntent(
        { name: "Ethereum" } as CryptoCurrency,
        eip1559Intent({ amount: 1n, recipient: "invalid-address" }),
      );

      expect(res.errors).toEqual({
        recipient: new InvalidAddress("", {
          currencyName: "Ethereum",
        }),
      });
    });

    it("detects the recipient being an ICAP with an error", async () => {
      const res = await validateIntent(
        { name: "Ethereum" } as CryptoCurrency,
        eip1559Intent({
          amount: 1n,
          recipient: "XE89MW3Y75UITCQ4F53YDKR25UFLB1640YM", // ICAP version of recipient address
        }),
      );
      expect(res.errors).toEqual({
        recipient: new InvalidAddress("", {
          currencyName: "Ethereum",
        }),
      });
    });

    it("detects the recipient not being an EIP55 address with a warning", async () => {
      const res = await validateIntent(
        { name: "Ethereum" } as CryptoCurrency,
        eip1559Intent({ amount: 1n, recipient: "0xe2ca7390e76c5a992749bb622087310d2e63ca29" }),
      );

      expect(res.warnings).toEqual(
        expect.objectContaining({
          recipient: new ETHAddressNonEIP(),
        }),
      );
    });
  });

  describe("amount", () => {
    it("detects an intent for native asset sending without amount with an error", async () => {
      const res = await validateIntent(
        {} as CryptoCurrency,
        eip1559Intent({
          recipient: "0xe2ca7390e76c5A992749bB622087310d2e63ca29",
          amount: 0n,
          asset: { type: "native" },
        }),
      );

      expect(res.errors).toEqual({
        amount: new AmountRequired(),
      });
    });

    it("detects an intent for token asset sending without amount with an error", async () => {
      const res = await validateIntent(
        {} as CryptoCurrency,
        eip1559Intent({
          recipient: "0xe2ca7390e76c5A992749bB622087310d2e63ca29",
          amount: 0n,
          asset: { type: "erc20" },
        }),
      );

      expect(res.errors).toEqual({
        amount: new AmountRequired(),
      });
    });

    it("detects native asset sending intent with an error", async () => {
      jest.spyOn(ledgerNode, "getCoinBalance").mockResolvedValue(new BigNumber(10));
      const res = await validateIntent(
        {} as CryptoCurrency,
        eip1559Intent({
          recipient: "0xe2ca7390e76c5A992749bB622087310d2e63ca29",
          amount: 20n,
          asset: { type: "native" },
        }),
      );

      expect(res.errors).toEqual({
        amount: new NotEnoughBalance(),
      });
    });

    it("detects token asset sending intent with an error", async () => {
      jest.spyOn(ledgerExplorer, "getLastOperations").mockResolvedValue({
        lastCoinOperations: [],
        lastInternalOperations: [],
        lastNftOperations: [],
        lastTokenOperations: [{ contract: "contract-address" } as Operation],
      });
      const getTokenBalance = jest
        .spyOn(ledgerNode, "getTokenBalance")
        .mockResolvedValue(new BigNumber(10));

      const res = await validateIntent(
        {} as CryptoCurrency,
        eip1559Intent({
          sender: "sender-address",
          recipient: "0xe2ca7390e76c5A992749bB622087310d2e63ca29",
          amount: 20n,
          asset: { type: "erc20", assetReference: "contract-adress" },
        }),
      );

      expect(res.errors).toEqual({
        amount: new NotEnoughBalance(),
      });
      expect(getTokenBalance).toHaveBeenCalledWith({}, "sender-address", "contract-address");
    });
  });
});
