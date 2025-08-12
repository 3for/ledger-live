import { AccountBridge } from "@ledgerhq/types-live";
import BigNumber from "bignumber.js";
import { isValidAddress } from "@celo/utils/lib/address";
import getFeesForTransaction from "./getFeesForTransaction";
import { CeloAccount, Transaction } from "../types";
import { findSubAccountById } from "@ledgerhq/coin-framework/account/index";
import { CELO_STABLE_TOKENS } from "../constants";
import { celoKit } from "../network/sdk";
import { ethers } from "ethers";
import ERC20ABI from "../abis/erc20.abi.json";

export const prepareTransaction: AccountBridge<
  Transaction,
  CeloAccount
>["prepareTransaction"] = async (account, transaction) => {
  const kit = celoKit();

  if (transaction.recipient && !isValidAddress(transaction.recipient)) return transaction;

  if (["send", "vote"].includes(transaction.mode) && !transaction.recipient) return transaction;

  if (
    transaction.mode === "vote" &&
    !transaction.useAllAmount &&
    new BigNumber(transaction.amount).lte(0)
  )
    return transaction;

  const fees = await getFeesForTransaction({ account, transaction });

  const tokenAccount = findSubAccountById(account, transaction.subAccountId || "");
  const isTokenTransaction = tokenAccount?.type === "TokenAccount";

  const amount =
    transaction.useAllAmount && isTokenTransaction ? tokenAccount.balance : transaction.amount;

  let token;
  if (isTokenTransaction) {
    if (CELO_STABLE_TOKENS.includes(tokenAccount.token.id)) {
      token = await kit.contracts.getStableToken();
    } else {
      token = await kit.contracts.getErc20(tokenAccount.token.contractAddress);
    }
  } else {
    token = await kit.contracts.getGoldToken();
  }

  // let data = token.transfer(transaction.recipient, amount.toFixed()).txo.encodeABI();

  // TESTING PURPOSES ONLY. DELETE
  // const _token = await kit.contracts.getErc20(tetherContractAddress);
  // data = _token.transfer(transaction.recipient, amount.toFixed()).txo.encodeABI();

  const contract = new ethers.utils.Interface(ERC20ABI);
  const data = contract.encodeFunctionData("transfer", [
    transaction.recipient,
    transaction.amount.toFixed(),
  ]);

  const block = await kit.connection.web3.eth.getBlock("latest");
  const baseFee = BigInt(block.baseFeePerGas || 10);
  const priorityFee = BigInt(kit.connection.web3.utils.toWei("1", "gwei"));
  const maxFeePerGas = baseFee + priorityFee;

  return {
    ...transaction,
    fees,
    maxFeePerGas: maxFeePerGas.toString(),
    maxPriorityFeePerGas: priorityFee.toString(),
    data: Buffer.from(data.slice(2), "hex"),
  };
};

export default prepareTransaction;
