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
import { AbiItem } from "@celo/connect";
import { createPublicClient, createWalletClient, encodeFunctionData, http } from "viem";
import { celo } from "viem/chains";

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

  let amount =
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
  // const usdtAddress = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
  // const _token = await kit.contracts.getErc20(usdtAddress);
  // const data = _token.transfer(transaction.recipient, amount.toFixed()).txo.encodeABI().slice(2);

  // const contract = new ethers.utils.Interface(ERC20ABI);
  // const data = contract.encodeFunctionData("transfer", [
  //   transaction.recipient,
  //   transaction.amount.toFixed(),
  // ]);

  // const erc20Abi = [
  //   {
  //     constant: false,
  //     inputs: [
  //       { name: "_to", type: "address" },
  //       { name: "_value", type: "uint256" },
  //     ],
  //     name: "transfer",
  //     outputs: [{ name: "", type: "bool" }],
  //     type: "function",
  //   },
  //   {
  //     constant: true,
  //     inputs: [],
  //     name: "decimals",
  //     outputs: [{ name: "", type: "uint8" }],
  //     type: "function",
  //   },
  // ] as AbiItem[];

  // const usdtContract = new kit.connection.web3.eth.Contract(erc20Abi, usdtAddress);
  // const recipient = transaction.recipient;
  // const decimals = await usdtContract.methods.decimals().call();
  // let data;
  // if (transaction.amount.gt(0)) {
  //   amount = kit.connection.web3.utils
  //     .toBN(transaction.amount.toString())
  //     .mul(kit.connection.web3.utils.toBN(10).pow(kit.connection.web3.utils.toBN(decimals)));
  //   const transfer = usdtContract.methods.transfer(recipient, amount);
  //   data = transfer.encodeABI();
  // }

  // const block = await kit.connection.web3.eth.getBlock("latest");
  // const baseFee = BigInt(block.baseFeePerGas || 3000000);
  // const priorityFee = BigInt(kit.connection.web3.utils.toWei("3000000", "gwei"));
  // const maxFeePerGas = baseFee + priorityFee;

  const client = createPublicClient({
    transport: http(celo.rpcUrls.default.http[0] as string),
    chain: celo,
  });

  const walletClient = createWalletClient({
    transport: http(celo.rpcUrls.default.http[0] as string),
    chain: celo,
  });

  const usdtAbi = [
    {
      constant: false,
      inputs: [
        { name: "_to", type: "address" },
        { name: "_value", type: "uint256" },
      ],
      name: "transfer",
      outputs: [{ name: "", type: "bool" }],
      type: "function",
    },
  ];

  // const usdtAddress = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";

  const data = await encodeFunctionData({
    abi: usdtAbi,
    functionName: "transfer",
    args: [transaction.recipient, transaction.amount || BigNumber(1000000)],
  });

  const block = await client.getBlock({ blockTag: "latest" });
  const baseFee = block.baseFeePerGas || BigInt(30);
  const priorityFee = 1_000_000n;
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
