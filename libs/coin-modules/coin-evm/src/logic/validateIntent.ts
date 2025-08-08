import { ethers } from "ethers";
import type {
  AssetInfo,
  Balance,
  TransactionIntent,
  TransactionValidation,
} from "@ledgerhq/coin-framework/api/types";
import {
  AmountRequired,
  ETHAddressNonEIP,
  InvalidAddress,
  NotEnoughBalance,
  RecipientRequired,
} from "@ledgerhq/errors";
import { CryptoCurrency } from "@ledgerhq/types-cryptoassets";
import { isNative } from "../types";
import estimateFees from "./estimateFees";
import getBalance from "./getBalance";

function assetsAreEqual(asset1: AssetInfo, asset2: AssetInfo): boolean {
  if (asset1.type !== asset2.type) return false;

  if ("assetReference" in asset1 && "assetReference" in asset2) {
    return asset1.assetReference === asset2.assetReference;
  }

  return asset1.type === "native";
}

function findBalance(asset: AssetInfo, balances: Balance[]): Balance {
  return balances.find(b => assetsAreEqual(b.asset, asset)) ?? { asset, value: 0n };
}

// This regex will not work with Starknet since addresses are 65 caracters long after the 0x
const ethAddressRegEx = /^(0x)?[0-9a-fA-F]{40}$/;

/**
 * Validate the amount of a transaction for an account
 */
async function validateAmount(
  currency: CryptoCurrency,
  intent: TransactionIntent,
  totalSpent: bigint,
): Promise<Pick<TransactionValidation, "errors" | "warnings">> {
  const balance = findBalance(intent.asset, await getBalance(currency, intent.sender));

  if (!intent.amount) {
    return { errors: { amount: new AmountRequired() }, warnings: {} };
  }

  if (totalSpent > balance.value) {
    return { errors: { amount: new NotEnoughBalance() }, warnings: {} };
  }

  return { errors: {}, warnings: {} };
}

/**
 * Validate an address for a transaction
 */
function validateRecipient(
  currency: CryptoCurrency,
  intent: TransactionIntent,
): Pick<TransactionValidation, "errors" | "warnings"> {
  if (!intent.recipient) {
    return { errors: { recipient: new RecipientRequired() }, warnings: {} };
  }

  if (!intent.recipient.match(ethAddressRegEx)) {
    return {
      errors: {
        recipient: new InvalidAddress("", {
          currencyName: currency.name,
        }),
      },
      warnings: {},
    };
  }

  // Check if address is respecting EIP-55
  try {
    const recipientChecksumed = ethers.utils.getAddress(intent.recipient);
    if (intent.recipient !== recipientChecksumed) {
      // this case can happen if the user is entering an ICAP address.
      throw new Error();
    }
  } catch (e) {
    // either getAddress throws for a bad checksum or we throw manually if the recipient isn't the same.
    return { errors: {}, warnings: { recipient: new ETHAddressNonEIP() } }; // "Auto-verification not available: carefully verify the address"
  }

  return { errors: {}, warnings: {} };
}

export async function validateIntent(
  currency: CryptoCurrency,
  intent: TransactionIntent,
): Promise<TransactionValidation> {
  const estimatedFees = await estimateFees(currency, intent);
  const totalSpent = isNative(intent.asset) ? intent.amount + estimatedFees.value : intent.amount;

  const { errors: recipientErr, warnings: recipientWarn } = validateRecipient(currency, intent);
  const { errors: amountErr, warnings: amountWarn } = await validateAmount(
    currency,
    intent,
    totalSpent,
  );

  const errors = {
    ...recipientErr,
    ...amountErr,
  };
  const warnings = {
    ...recipientWarn,
    ...amountWarn,
  };

  return {
    errors,
    warnings,
    estimatedFees: estimatedFees.value,
    totalSpent,
    amount: intent.amount,
  };
}
