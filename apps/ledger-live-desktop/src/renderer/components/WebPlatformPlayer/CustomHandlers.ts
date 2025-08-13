import { useMemo } from "react";
import { ipcRenderer } from "electron";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { AccountLike } from "@ledgerhq/types-live";
import { useToasts } from "@ledgerhq/live-common/notifications/ToastProvider/index";
import {
  addPendingOperation,
  encodeAccountId,
  makeEmptyTokenAccount,
  emptyHistoryCache,
} from "@ledgerhq/live-common/account/index";
import { WalletAPICustomHandlers } from "@ledgerhq/live-common/wallet-api/types";
import { handlers as acreHandlers } from "@ledgerhq/live-common/wallet-api/ACRE/server";
import trackingWrapper from "@ledgerhq/live-common/wallet-api/ACRE/tracking";
import { addAccountsAction } from "@ledgerhq/live-wallet/addAccounts";
import { getCryptoCurrencyById } from "@ledgerhq/cryptoassets/currencies";
import { findTokenById } from "@ledgerhq/live-common/currencies/index";
import { asDerivationMode } from "@ledgerhq/coin-framework/derivation";
import { track } from "~/renderer/analytics/segment";
import { openModal } from "~/renderer/actions/modals";
import { setDrawer } from "~/renderer/drawers/Provider";
import { OperationDetails } from "~/renderer/drawers/OperationDetails";
import { currentRouteNameRef } from "~/renderer/analytics/screenRefs";
import { updateAccountWithUpdater } from "~/renderer/actions/accounts";
import { WebviewProps } from "../Web3AppWebview/types";
import BigNumber from "bignumber.js";
import { findTokenByAddressInCurrency } from "@ledgerhq/cryptoassets/lib-es/tokens";

export function useACRECustomHandlers(manifest: WebviewProps["manifest"], accounts: AccountLike[]) {
  const { pushToast } = useToasts();
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const tracking = useMemo(
    () =>
      trackingWrapper(
        (
          eventName: string,
          properties?: Record<string, unknown> | null,
          mandatory?: boolean | null,
        ) =>
          track(
            eventName,
            {
              ...properties,
              flowInitiatedFrom:
                currentRouteNameRef.current === "Platform Catalog"
                  ? "Discover"
                  : currentRouteNameRef.current,
            },
            mandatory,
          ),
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
            ipcRenderer.send("show-app", {});
            dispatch(
              openModal("MODAL_SIGN_MESSAGE", {
                isACRE: true,
                account,
                message,
                useApp: options?.hwAppId,
                dependencies: options?.dependencies,
                onConfirmationHandler: onSuccess,
                onFailHandler: onError,
                onClose: onCancel,
              }),
            );
          },
          "custom.acre.transactionSign": ({
            account,
            parentAccount,
            signFlowInfos: { canEditFees, hasFeesProvided, liveTx },
            options,
            onSuccess,
            onError,
          }) => {
            ipcRenderer.send("show-app", {});
            dispatch(
              openModal("MODAL_SIGN_TRANSACTION", {
                isACRE: true,
                canEditFees,
                stepId: canEditFees && !hasFeesProvided ? "amount" : "summary",
                transactionData: liveTx,
                useApp: options?.hwAppId,
                dependencies: options?.dependencies,
                account,
                parentAccount,
                onResult: onSuccess,
                onCancel: onError,
                manifestId: manifest.id,
                manifestName: manifest.name,
              }),
            );
          },
          "custom.acre.transactionBroadcast": (
            account,
            parentAccount,
            mainAccount,
            optimisticOperation,
          ) => {
            dispatch(
              updateAccountWithUpdater(mainAccount.id, account =>
                addPendingOperation(account, optimisticOperation),
              ),
            );

            pushToast({
              id: optimisticOperation.id,
              type: "operation",
              title: t("platform.flows.broadcast.toast.title"),
              text: t("platform.flows.broadcast.toast.text"),
              icon: "info",
              callback: () => {
                tracking.broadcastOperationDetailsClick(manifest);
                setDrawer(OperationDetails, {
                  operationId: optimisticOperation.id,
                  accountId: account.id,
                  parentId: parentAccount?.id as string | undefined | null,
                });
              },
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
              console.log("✅ Entering into LLD CustomHandler WebPlatformPlayer");
              // Debug: Check for any existing accounts with undefined currencies
              const accountsWithUndefinedCurrency = accounts.filter(acc => !acc.currency);
              if (accountsWithUndefinedCurrency.length > 0) {
                console.warn(
                  "Found accounts with undefined currency:",
                  accountsWithUndefinedCurrency,
                );
              }

              // Get the proper Ethereum currency from cryptoassets with error handling
              let ethereumCurrency;
              try {
                ethereumCurrency = getCryptoCurrencyById("ethereum");
                if (!ethereumCurrency) {
                  throw new Error("Ethereum currency not found");
                }
                console.log("✅ Ethereum currency loaded:", ethereumCurrency.id, ethereumCurrency.name);
              } catch (currencyError) {
                console.error("Error getting Ethereum currency:", currencyError);
                onError(new Error("Failed to get Ethereum currency configuration"));
                return;
              }

              // Validate that the currency has all required properties
              if (!ethereumCurrency.id || !ethereumCurrency.name || !ethereumCurrency.units) {
                console.error("Invalid currency structure:", ethereumCurrency);
                onError(new Error("Invalid currency configuration"));
                return;
              }

              // Additional validation to ensure currency is properly structured
              if (!ethereumCurrency.type || ethereumCurrency.type !== "CryptoCurrency") {
                console.error("Invalid currency type:", ethereumCurrency.type);
                onError(new Error("Invalid currency type"));
                return;
              }

              // Create the parent Ethereum account with all required fields
              const parentAccountId = encodeAccountId({
                type: "js",
                version: "2",
                currencyId: ethereumCurrency.id,
                xpubOrAddress: ethereumAddress,
                derivationMode: asDerivationMode(""),
              });

              const parentAccount = {
                type: "Account" as const,
                id: parentAccountId,
                xpub: ethereumAddress,
                seedIdentifier: ethereumAddress,
                derivationMode: asDerivationMode(""),
                index: 0,
                freshAddress: ethereumAddress,
                freshAddressPath: "44'/60'/0'/0/0",
                used: true,
                blockHeight: 0,
                creationDate: new Date(),
                balance: new BigNumber(0),
                spendableBalance: new BigNumber(0),
                operationsCount: 0,
                operations: [],
                pendingOperations: [],
                currency: ethereumCurrency,
                lastSyncDate: new Date(0),
                swapHistory: [],
                balanceHistoryCache: emptyHistoryCache,
                name: `ACRE Ethereum Account`,
                starred: false,
                syncHash: "",
                nfts: [],
              };

              // Validate the parent account structure
              if (!parentAccount.currency || !parentAccount.currency.id) {
                console.error("Parent account currency validation failed:", parentAccount);
                onError(new Error("Failed to create parent account with valid currency"));
                return;
              }
              console.log("✅ Parent Account Structure Validated:", parentAccount);
              // Additional validation to ensure the currency object is complete
              if (!parentAccount.currency.name || !parentAccount.currency.ticker) {
                console.error("Incomplete currency object:", parentAccount.currency);
                onError(new Error("Incomplete currency object"));
                return;
              }

              console.log(
                "✅ Parent account created:",
                parentAccount.id,
                "with currency:",
                parentAccount.currency?.id,
              );

              // Ensure tokenContractAddress is defined before passing to findTokenByAddressInCurrency
              if (!tokenContractAddress) {
                console.error("Token contract address is undefined");
                onError(new Error("Token contract address is undefined"));
                return;
              }

              const existingToken = findTokenByAddressInCurrency(tokenContractAddress, "ethereum");

              if (!existingToken) {
                console.error("Wrapped Bitcoin token not found");
                onError(new Error("Wrapped Bitcoin token not available"));
                return;
              }

              // Use makeEmptyTokenAccount to create a proper token account
              const tokenAccount = makeEmptyTokenAccount(parentAccount, existingToken);

              // Validate the token account structure
              if (!tokenAccount.token || !tokenAccount.token.id) {
                console.error("Token account validation failed:", tokenAccount);
                onError(new Error("Failed to create token account with valid token"));
                return;
              }

              console.log("✅ Token account created:", tokenAccount.id, tokenAccount);

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
                accountName: "Yield-bearing Wrapped Bitcoin on ACRE",
                parentAccountId: parentAccount.id,
                tokenAccountId: tokenAccount.id,
                ethereumAddress,
                tokenContractAddress:
                  tokenContractAddress || "0x0000000000000000000000000000000000000000",
                meta,
              });

              // Show success toast
              pushToast({
                id: `acre-account-${ethereumAddress}`,
                type: "success",
                title: t("platform.acre.accountAdded.title"),
                text: t("platform.acre.accountAdded.text"),
                icon: "info",
              });
            } catch (error) {
              console.error("Error creating ACRE accounts:", error);
              onError(error instanceof Error ? error : new Error("Failed to create accounts"));
            }
          },
        },
      }),
    };
  }, [accounts, tracking, manifest, dispatch, pushToast, t]);
}
