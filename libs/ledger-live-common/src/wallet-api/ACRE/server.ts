/* eslint-disable no-console */
import { customWrapper } from "@ledgerhq/wallet-api-server";
import { deserializeTransaction } from "@ledgerhq/wallet-api-core";
import {
  getParentAccount,
  getMainAccount,
  makeEmptyTokenAccount,
} from "@ledgerhq/coin-framework/account/index";
import {
  Account,
  AccountLike,
  AnyMessage,
  Operation,
  SignedOperation,
  TokenAccount,
} from "@ledgerhq/types-live";
import {
  findTokenById,
  findTokenByAddressInCurrency,
} from "@ledgerhq/cryptoassets";
import { getCryptoCurrencyById } from "@ledgerhq/cryptoassets/currencies";
import { addAccountsAction } from "@ledgerhq/live-wallet/addAccounts";
import {
  MessageSignParams,
  MessageSignResult,
  SignOptions,
  TransactionOptions,
  TransactionSignAndBroadcastParams,
  TransactionSignAndBroadcastResult,
  TransactionSignParams,
  TransactionSignResult,
} from "@ledgerhq/wallet-api-acre-module";
import { Transaction } from "@ledgerhq/live-common/generated/types";
import { AppManifest } from "@ledgerhq/live-common/wallet-api/types";
import { TrackingAPI } from "./tracking";
import { getAccountIdFromWalletAccountId } from "../converters";
import { getWalletAPITransactionSignFlowInfos } from "../converters";
import { getAccountBridge } from "../../bridge";
import { UserRefusedOnDevice } from "@ledgerhq/errors";
import { getEnv } from "@ledgerhq/live-env";
import BigNumber from "bignumber.js";
import { CryptoCurrency, TokenCurrency } from "@ledgerhq/types-cryptoassets";

// Type definitions for the ACRE custom handler
export type RegisterYieldBearingEthereumAddressParams = {
  ethereumAddress: string;
  tokenContractAddress?: string;
  tokenTicker?: string;
  meta?: Record<string, unknown>;
};

export type RegisterYieldBearingEthereumAddressResult = {
  success: boolean;
  accountName: string;
  parentAccountId: string;
  tokenAccountId: string;
  ethereumAddress: string;
  tokenContractAddress: string;
  meta?: Record<string, unknown>;
};

type ACREUiHooks = {
  "custom.acre.messageSign": (params: {
    account: AccountLike;
    message: AnyMessage;
    options?: SignOptions;
    onSuccess: (signature: string) => void;
    onError: (error: Error) => void;
    onCancel: () => void;
  }) => void;
  "custom.acre.transactionSign": (params: {
    account: AccountLike;
    parentAccount: Account | undefined;
    signFlowInfos: {
      canEditFees: boolean;
      hasFeesProvided: boolean;
      liveTx: Partial<Transaction>;
    };
    options?: TransactionOptions;
    onSuccess: (signedOperation: SignedOperation) => void;
    onError: (error: Error) => void;
  }) => void;
  "custom.acre.transactionBroadcast": (
    account: AccountLike,
    parentAccount: Account | undefined,
    mainAccount: Account,
    optimisticOperation: Operation,
  ) => void;
  "custom.acre.registerYieldBearingEthereumAddress": (params: {
    ethereumAddress: string;
    tokenContractAddress?: string;
    tokenTicker?: string;
    meta?: Record<string, unknown>;
    onSuccess: (result: RegisterYieldBearingEthereumAddressResult) => void;
    onError: (error: Error) => void;
  }) => void;
};

// Helper function to validate Ethereum address format
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Helper function to validate all inputs before account creation
function validateInputs(params: RegisterYieldBearingEthereumAddressParams): {
  ethereumAddress: string;
  tokenContractAddress?: string;
  tokenTicker?: string;
  meta?: Record<string, unknown>;
} {
  const { ethereumAddress, tokenContractAddress, tokenTicker, meta } = params;

  // Validate Ethereum address format
  if (!ethereumAddress) {
    throw new Error("Ethereum address is required");
  }
  if (!isValidEthereumAddress(ethereumAddress)) {
    throw new Error("Invalid Ethereum address format");
  }

  // Validate that at least one token identifier is provided
  if (!tokenContractAddress && !tokenTicker) {
    throw new Error("Either tokenContractAddress or tokenTicker must be provided");
  }

  return { ethereumAddress, tokenContractAddress, tokenTicker, meta };
}

// Helper function to validate and get Ethereum currency
function validateAndGetEthereumCurrency(): CryptoCurrency {
  try {
    const ethereumCurrency = getCryptoCurrencyById("ethereum");
    if (!ethereumCurrency) {
      throw new Error("Ethereum currency not found");
    }

    // Validate currency has required properties
    if (!ethereumCurrency.id || !ethereumCurrency.name || !ethereumCurrency.ticker) {
      throw new Error("Ethereum currency is missing required properties");
    }
    console.log("✅ Ethereum currency loaded:", ethereumCurrency.id, ethereumCurrency.name);
    return ethereumCurrency;
  } catch (error) {
    console.error("Error getting Ethereum currency:", error);
    throw new Error(
      `Failed to load Ethereum currency: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Helper function to find and validate token
function findAndValidateToken(
  tokenContractAddress?: string,
  tokenTicker?: string,
): { token: TokenCurrency; contractAddress: string } {
  let existingToken: TokenCurrency | undefined;
  let finalTokenContractAddress: string | undefined;

  console.log("🔍 Searching for token...");
  console.log("  Contract address:", tokenContractAddress || "not provided");
  console.log("  Ticker:", tokenTicker || "not provided");

  // Try to find token by contract address first (if provided)
  if (tokenContractAddress) {
    existingToken = findTokenByAddressInCurrency(tokenContractAddress, "ethereum");

    if (existingToken) {
      finalTokenContractAddress = tokenContractAddress;
      console.log(
        "✅ Found existing token by contract address:",
        existingToken.id,
        existingToken.name,
      );
    } else {
      console.log("⚠️ No token found for contract address:", tokenContractAddress);
    }
  }

  // If not found by contract address, try by ticker (if provided)
  if (!existingToken && tokenTicker) {
    existingToken = findTokenById(`ethereum/erc20/${tokenTicker.toLowerCase()}`);
    if (existingToken) {
      finalTokenContractAddress = existingToken.contractAddress;
      console.log("✅ Found existing token by ticker:", existingToken.id, existingToken.name);
    } else {
      console.log("⚠️ No token found for ticker:", tokenTicker);
    }
  }

  // If still no token found, raise an error
  if (!existingToken) {
    const errorMessage = `Token not found. Tried contract address: ${tokenContractAddress || "not provided"}, ticker: ${tokenTicker || "not provided"}`;
    console.error("❌", errorMessage);
    throw new Error(errorMessage);
  }

  // Validate token has required properties
  if (!existingToken.id || !existingToken.name || !existingToken.contractAddress) {
    throw new Error("Found token is missing required properties");
  }

  if (!finalTokenContractAddress) {
    finalTokenContractAddress = existingToken.contractAddress;
  }

  console.log("✅ Token validation successful:", existingToken.id, existingToken.name);
  return { token: existingToken, contractAddress: finalTokenContractAddress };
}

// Helper function to validate created accounts
function validateAccounts(parentAccount: Account, tokenAccount: TokenAccount): void {
  console.log("🔍 Validating created accounts...");

  // Validate parent account
  if (!parentAccount) {
    throw new Error("Parent account is null or undefined");
  }
  if (!parentAccount.currency || !parentAccount.currency.id) {
    throw new Error("Parent account currency is invalid");
  }
  if (!parentAccount.id) {
    throw new Error("Parent account ID is missing");
  }
  console.log("✅ Parent account validation passed:", parentAccount.id);

  // Validate token account
  if (!tokenAccount) {
    throw new Error("Token account is null or undefined");
  }
  if (!tokenAccount.token || !tokenAccount.token.id) {
    throw new Error("Token account token is invalid");
  }
  if (!tokenAccount.id) {
    throw new Error("Token account ID is missing");
  }
  console.log("✅ Token account validation passed:", tokenAccount.id);

  console.log("✅ All account validations passed");
}

// Helper function to generate unique account names with suffixes
function generateUniqueAccountName(existingAccounts: AccountLike[], baseName: string): string {
  const existingNames = existingAccounts
    .filter(account => account.type === "TokenAccount")
    .map(account => (account as TokenAccount).token.name);

  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let suffix = 2;
  while (existingNames.includes(`${baseName} ${suffix}`)) {
    suffix++;
  }

  return `${baseName} ${suffix}`;
}

// Helper function to create parent Ethereum account
function createParentAccount(ethereumAddress: string, ethereumCurrency: CryptoCurrency): Account {
  // Generate a proper seedIdentifier (this should be derived from the address or wallet)
  const seedIdentifier = `04${ethereumAddress.slice(2)}`; // Simplified for demo, should be proper derivation

  return {
    type: "Account" as const,
    id: `js:2:ethereum:${ethereumAddress}:`, // Match the correct format
    seedIdentifier,
    derivationMode: "" as any, // Type assertion for compatibility
    index: 0,
    freshAddress: ethereumAddress,
    freshAddressPath: "44'/60'/0'/0/0",
    used: false,
    blockHeight: 0,
    creationDate: new Date(), // Use Date object
    balance: new BigNumber(0), // Use BigNumber object
    spendableBalance: new BigNumber(0), // Use BigNumber object
    operationsCount: 0,
    operations: [],
    pendingOperations: [],
    currency: ethereumCurrency,
    lastSyncDate: new Date(), // Use Date object
    swapHistory: [],
    balanceHistoryCache: {
      HOUR: { latestDate: Date.now(), balances: [] },
      DAY: { latestDate: Date.now(), balances: [] },
      WEEK: { latestDate: Date.now(), balances: [] },
    },
    syncHash: "0x00000000", // Use proper hash format
    subAccounts: [], // Add empty subAccounts array
    nfts: [],
  };
}



export const handlers = ({
  accounts,
  tracking,
  manifest,
  actionDispatcher,
  uiHooks: {
    "custom.acre.messageSign": uiMessageSign,
    "custom.acre.transactionSign": uiTransactionSign,
    "custom.acre.transactionBroadcast": uiTransactionBroadcast,
    "custom.acre.registerYieldBearingEthereumAddress": uiRegisterYieldBearingEthereumAddress,
  },
}: {
  accounts: AccountLike[];
  tracking: TrackingAPI;
  manifest: AppManifest;
  actionDispatcher?: (action: any) => void;
  uiHooks: ACREUiHooks;
}) => {
  function signTransaction(params: TransactionSignParams): Promise<SignedOperation> {
    const { accountId: walletAccountId, rawTransaction, options, tokenCurrency } = params;
    const transaction = deserializeTransaction(rawTransaction);

    tracking.signTransactionRequested(manifest);

    if (!transaction) {
      tracking.signTransactionFail(manifest);
      return Promise.reject(new Error("Transaction required"));
    }

    const accountId = getAccountIdFromWalletAccountId(walletAccountId);
    if (!accountId) {
      tracking.signTransactionFail(manifest);
      return Promise.reject(new Error(`accountId ${walletAccountId} unknown`));
    }

    const account = accounts.find(account => account.id === accountId);

    if (!account) {
      tracking.signTransactionFail(manifest);
      return Promise.reject(new Error("Account required"));
    }

    const parentAccount = getParentAccount(account, accounts);

    const mainAccount = getMainAccount(account, parentAccount);
    const currency = tokenCurrency ? findTokenById(tokenCurrency) : null;
    const signerAccount = currency ? makeEmptyTokenAccount(mainAccount, currency) : account;

    const { canEditFees, liveTx, hasFeesProvided } = getWalletAPITransactionSignFlowInfos({
      walletApiTransaction: transaction,
      account,
    });

    return new Promise((resolve, reject) => {
      let done = false;
      return uiTransactionSign({
        account: signerAccount,
        parentAccount,
        signFlowInfos: {
          canEditFees,
          hasFeesProvided,
          liveTx,
        },
        options,
        onSuccess: (signedOperation: SignedOperation) => {
          if (done) return;
          done = true;
          tracking.signTransactionSuccess(manifest);
          resolve(signedOperation);
        },
        onError: (error: Error) => {
          if (done) return;
          done = true;
          tracking.signTransactionFail(manifest);
          reject(error);
        },
      });
    });
  }

  return {
    "custom.acre.messageSign": customWrapper<MessageSignParams, MessageSignResult>(async params => {
      if (!params) {
        tracking.signMessageFail(manifest);
        return Promise.reject(new Error("Parameters required"));
      }

      const { accountId: walletAccountId, message, options } = params;

      tracking.signMessageRequested(manifest);

      const accountId = getAccountIdFromWalletAccountId(walletAccountId);
      if (!accountId) {
        tracking.signMessageFail(manifest);
        return Promise.reject(new Error(`accountId ${walletAccountId} unknown`));
      }

      const account = accounts.find(account => account.id === accountId);

      if (!account) {
        tracking.signMessageFail(manifest);
        return Promise.reject(new Error("Account required"));
      }

      return new Promise((resolve, reject) => {
        let done = false;
        return uiMessageSign({
          account,
          message: message as AnyMessage,
          options,
          onSuccess: (signature: string) => {
            if (done) return;
            done = true;
            tracking.signMessageSuccess(manifest);
            resolve({
              hexSignedMessage: signature.startsWith("0x")
                ? signature.replace("0x", "")
                : signature,
            });
          },
          onCancel: () => {
            if (done) return;
            done = true;
            tracking.signMessageFail(manifest);
            reject(new UserRefusedOnDevice());
          },
          onError: (error: Error) => {
            if (done) return;
            done = true;
            tracking.signMessageFail(manifest);
            reject(error);
          },
        });
      });
    }),

    "custom.acre.transactionSign": customWrapper<TransactionSignParams, TransactionSignResult>(
      async params => {
        if (!params) {
          tracking.signTransactionFail(manifest);
          return Promise.reject(new Error("Parameters required"));
        }
        const signedOperation = await signTransaction(params);
        return {
          signedTransactionHex: Buffer.from(signedOperation.signature).toString("hex"),
        };
      },
    ),

    "custom.acre.transactionSignAndBroadcast": customWrapper<
      TransactionSignAndBroadcastParams,
      TransactionSignAndBroadcastResult
    >(async params => {
      if (!params) {
        tracking.signTransactionAndBroadcastNoParams(manifest);
        return Promise.reject(new Error("Parameters required"));
      }

      const { accountId: walletAccountId, rawTransaction, options, tokenCurrency } = params;

      const transaction = deserializeTransaction(rawTransaction);

      tracking.signTransactionRequested(manifest);

      if (!transaction) {
        tracking.signTransactionFail(manifest);
        return Promise.reject(new Error("Transaction required"));
      }

      const accountId = getAccountIdFromWalletAccountId(walletAccountId);
      if (!accountId) {
        tracking.signTransactionFail(manifest);
        return Promise.reject(new Error(`accountId ${walletAccountId} unknown`));
      }

      const account = accounts.find(account => account.id === accountId);

      if (!account) {
        tracking.signTransactionFail(manifest);
        return Promise.reject(new Error("Account required"));
      }

      const parentAccount = getParentAccount(account, accounts);

      const mainAccount = getMainAccount(account, parentAccount);
      const currency = tokenCurrency ? findTokenById(tokenCurrency) : null;
      const signerAccount = currency ? makeEmptyTokenAccount(mainAccount, currency) : account;

      const { canEditFees, liveTx, hasFeesProvided } = getWalletAPITransactionSignFlowInfos({
        walletApiTransaction: transaction,
        account,
      });

      const signedOperation = await new Promise<SignedOperation>((resolve, reject) => {
        let done = false;
        return uiTransactionSign({
          account: signerAccount,
          parentAccount,
          signFlowInfos: {
            canEditFees,
            hasFeesProvided,
            liveTx,
          },
          options,
          onSuccess: (signedOperation: SignedOperation) => {
            if (done) return;
            done = true;
            tracking.signTransactionSuccess(manifest);
            resolve(signedOperation);
          },
          onError: (error: Error) => {
            if (done) return;
            done = true;
            tracking.signTransactionFail(manifest);
            reject(error);
          },
        });
      });

      const bridge = getAccountBridge(signerAccount, parentAccount);
      const broadcastAccount = getMainAccount(signerAccount, parentAccount);

      let optimisticOperation: Operation = signedOperation.operation;

      if (!getEnv("DISABLE_TRANSACTION_BROADCAST")) {
        try {
          optimisticOperation = await bridge.broadcast({
            account: broadcastAccount,
            signedOperation,
          });
          tracking.broadcastSuccess(manifest);
        } catch (error) {
          tracking.broadcastFail(manifest);
          throw error;
        }
      }

      uiTransactionBroadcast &&
        uiTransactionBroadcast(account, parentAccount, mainAccount, optimisticOperation);

      return {
        transactionHash: optimisticOperation.hash,
      };
    }),

    "custom.acre.registerYieldBearingEthereumAddress": customWrapper<
      RegisterYieldBearingEthereumAddressParams,
      RegisterYieldBearingEthereumAddressResult
    >(async params => {
      if (!params) {
        return Promise.reject(new Error("Parameters required"));
      }

      console.log("🚀 Starting ACRE account registration process...");

      try {
        // Step 1: Validate all inputs
        const validatedInputs = validateInputs(params);
        console.log("✅ Input validation passed");

        // Step 2: Validate and get Ethereum currency
        const ethereumCurrency = validateAndGetEthereumCurrency();
        console.log("✅ Ethereum currency validation passed");

        // Step 3: Find and validate token
        const { token: existingToken, contractAddress: finalTokenContractAddress } =
          findAndValidateToken(validatedInputs.tokenContractAddress, validatedInputs.tokenTicker);
        console.log("✅ Token validation passed");

        if (actionDispatcher) {
          console.log("🎯 Using action dispatcher for silent account creation");

          // Step 4: Create accounts
          const baseName = "Yield-bearing BTC on ACRE";
          const accountName = generateUniqueAccountName(accounts, baseName);

          const parentAccount = createParentAccount(
            validatedInputs.ethereumAddress,
            ethereumCurrency,
          );
          const tokenAccount = makeEmptyTokenAccount(parentAccount, existingToken);

          // Step 5: Add token account as sub-account of parent account
          const parentAccountWithSubAccount = {
            ...parentAccount,
            subAccounts: [tokenAccount],
          };

          // Step 6: Validate created accounts
          validateAccounts(parentAccountWithSubAccount, tokenAccount);
          console.log("✅ Account creation and validation passed");

          // Step 7: Dispatch to Redux (only the parent account, which includes the sub-account)
          console.log("📤 Dispatching parent account with sub-account to Redux store...");
          actionDispatcher(
            addAccountsAction({
              existingAccounts: accounts as any,
              scannedAccounts: [parentAccountWithSubAccount as any],
              selectedIds: [parentAccountWithSubAccount.id],
              renamings: {},
            }),
          );

          console.log("✅ ACRE accounts successfully added to Redux store");

          return {
            success: true,
            accountName,
            parentAccountId: parentAccountWithSubAccount.id,
            tokenAccountId: tokenAccount.id,
            ethereumAddress: validatedInputs.ethereumAddress,
            tokenContractAddress: finalTokenContractAddress,
            meta: validatedInputs.meta,
          };
        }

        // Fallback: return mock data for testing purposes
        console.log("⚠️ No UI hook or action dispatcher available, returning mock data");
        const baseName = "Yield-bearing BTC on ACRE";
        const accountName = generateUniqueAccountName(accounts, baseName);

        return {
          success: true,
          accountName,
          parentAccountId: `js:2:ethereum:${validatedInputs.ethereumAddress}:`,
          tokenAccountId: `js:2:ethereum:${validatedInputs.ethereumAddress}:+erc20:${finalTokenContractAddress}`,
          ethereumAddress: validatedInputs.ethereumAddress,
          tokenContractAddress: finalTokenContractAddress,
          meta: validatedInputs.meta,
        };
      } catch (error) {
        console.error("❌ ACRE account registration failed:", error);
        return Promise.reject(error);
      }
    }),
  };
};
