import { useMemo } from "react";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import type { AccountLike } from "@ledgerhq/types-live";
import { WalletAPICustomHandlers } from "@ledgerhq/live-common/wallet-api/types";
import { handlers as acreHandlers } from "@ledgerhq/live-common/wallet-api/ACRE/server";
import trackingWrapper from "@ledgerhq/live-common/wallet-api/ACRE/tracking";
import { addAccountsAction } from "@ledgerhq/live-wallet/addAccounts";
import { getCryptoCurrencyById } from "@ledgerhq/cryptoassets/currencies";
import { track } from "~/analytics";
import { NavigatorName, ScreenName } from "~/const";
import { currentRouteNameRef } from "~/analytics/screenRefs";
import { StackNavigatorNavigation } from "../RootNavigator/types/helpers";
import { BaseNavigatorStackParamList } from "../RootNavigator/types/BaseNavigator";
import { WebviewProps } from "../Web3AppWebview/types";
import prepareSignTransaction from "../Web3AppWebview/liveSDKLogic";
import BigNumber from "bignumber.js";

export function useACRECustomHandlers(manifest: WebviewProps["manifest"], accounts: AccountLike[]) {
  const navigation = useNavigation<StackNavigatorNavigation<BaseNavigatorStackParamList>>();
  const dispatch = useDispatch();

  const tracking = useMemo(
    () =>
      trackingWrapper((eventName: string, properties?: Record<string, unknown> | null) =>
        track(eventName, {
          ...properties,
          flowInitiatedFrom:
            currentRouteNameRef.current === "Platform Catalog"
              ? "Discover"
              : currentRouteNameRef.current,
        }),
      ),
    [],
  );

  return useMemo<WalletAPICustomHandlers>(() => {
    return {
      ...acreHandlers({
        accounts,
        tracking,
        manifest,
        actionDispatcher: dispatch,
        uiHooks: {
          "custom.acre.messageSign": ({
            account,
            message,
            options,
            onSuccess,
            onError,
            onCancel,
          }) => {
            navigation.navigate(NavigatorName.SignMessage, {
              screen:
                message.standard === "EIP712"
                  ? ScreenName.SignSelectDevice
                  : ScreenName.SignSummary,
              params: {
                message,
                accountId: account.id,
                appName: options?.hwAppId,
                dependencies: options?.dependencies,
                onConfirmationHandler: onSuccess,
                onFailHandler: onError,
                isACRE: true,
              },
              onClose: onCancel,
            });
          },
          "custom.acre.transactionSign": ({
            account,
            parentAccount,
            signFlowInfos: { liveTx },
            options,
            onSuccess,
            onError,
          }) => {
            const tx = prepareSignTransaction(account, parentAccount, liveTx);

            navigation.navigate(NavigatorName.SignTransaction, {
              screen: ScreenName.SignTransactionSummary,
              params: {
                currentNavigation: ScreenName.SignTransactionSummary,
                nextNavigation: ScreenName.SignTransactionSelectDevice,
                transaction: tx,
                accountId: account.id,
                parentId: parentAccount ? parentAccount.id : undefined,
                appName: options?.hwAppId,
                dependencies: options?.dependencies,
                isACRE: true,
                onSuccess,
                onError,
              },
              onError,
            });
          },
          "custom.acre.registerYieldBearingEthereumAddress": ({
            ethereumAddress,
            tokenContractAddress,
            meta,
            onSuccess,
            onError,
          }) => {
            try {
              // Get the proper Ethereum currency from cryptoassets with error handling
              let ethereumCurrency;
              try {
                ethereumCurrency = getCryptoCurrencyById("ethereum");
                if (!ethereumCurrency) {
                  throw new Error("Ethereum currency not found");
                }
                console.log(
                  "✅ Ethereum currency loaded:",
                  ethereumCurrency.id,
                  ethereumCurrency.name,
                );
              } catch (currencyError) {
                console.error("Error getting Ethereum currency:", currencyError);
                onError(new Error("Failed to get Ethereum currency configuration"));
                return;
              }

              // Create the parent Ethereum account with all required fields
              const parentAccount = {
                type: "Account" as const,
                id: `ethereum:${ethereumAddress}:ethereum`,
                seedIdentifier: ethereumAddress,
                derivationMode: "",
                index: 0,
                freshAddress: ethereumAddress,
                freshAddressPath: "44'/60'/0'/0/0",
                used: false,
                blockHeight: 0,
                creationDate: new Date(),
                balance: new BigNumber(0),
                spendableBalance: new BigNumber(0),
                operationsCount: 0,
                operations: [],
                pendingOperations: [],
                currency: ethereumCurrency, // This must be properly set
                lastSyncDate: new Date(),
                swapHistory: [],
                balanceHistoryCache: {
                  HOUR: { latestDate: null, balances: [] },
                  DAY: { latestDate: null, balances: [] },
                  WEEK: { latestDate: null, balances: [] },
                },
                // Add any missing required fields
                name: `ACRE Ethereum Account`,
                starred: false,
                syncHash: "",
                nfts: [],
              };

              console.log(
                "✅ Parent account created:",
                parentAccount.id,
                "with currency:",
                parentAccount.currency?.id,
              );

              // Create the token account for acreBTC
              const tokenAccount = {
                type: "TokenAccount" as const,
                id: `ethereum:${ethereumAddress}:ethereum+erc20:${tokenContractAddress || "0x0000000000000000000000000000000000000000"}`,
                parentId: parentAccount.id,
                token: {
                  type: "TokenCurrency",
                  id: "ethereum/erc20/acre_btc",
                  contractAddress: tokenContractAddress || "0x0000000000000000000000000000000000000000",
                  standard: "ERC20",
                  name: "ACRE Bitcoin",
                  ticker: "acreBTC",
                  decimal: 8,
                  delisted: false,
                  disableCountervalue: false,
                  network: "ethereum",
                  color: "#f7931a",
                  parentCurrency: ethereumCurrency,
                  units: [
                    {
                      name: "ACRE Bitcoin",
                      code: "acreBTC",
                      magnitude: 8,
                    },
                  ],
                },
                balance: new BigNumber(0),
                spendableBalance: new BigNumber(0),
                creationDate: new Date(),
                operationsCount: 0,
                operations: [],
                pendingOperations: [],
                swapHistory: [],
                balanceHistoryCache: {
                  HOUR: { latestDate: null, balances: [] },
                  DAY: { latestDate: null, balances: [] },
                  WEEK: { latestDate: null, balances: [] },
                },
              };

              console.log("✅ Token account created:", tokenAccount.id);

              // Add both accounts to the system using Redux action
              dispatch(
                addAccountsAction({
                  existingAccounts: accounts,
                  scannedAccounts: [parentAccount, tokenAccount],
                  selectedIds: [parentAccount.id, tokenAccount.id],
                  renamings: {},
                }),
              );

              console.log("✅ Accounts dispatched to Redux store");

              // Return success result
              onSuccess({
                success: true,
                accountName: "Yield-bearing BTC on ACRE",
                parentAccountId: parentAccount.id,
                tokenAccountId: tokenAccount.id,
                ethereumAddress,
                tokenContractAddress: tokenContractAddress || "0x0000000000000000000000000000000000000000",
                meta,
              });

            } catch (error) {
              console.error("Error creating ACRE accounts:", error);
              onError(error instanceof Error ? error : new Error("Failed to create accounts"));
            }
          },
        },
      }),
    };
  }, [accounts, tracking, manifest, navigation, dispatch]);
}
