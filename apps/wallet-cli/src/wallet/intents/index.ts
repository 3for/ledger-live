import { z } from "zod";

import { AmountWithTickerSchema, BitcoinTransactionIntentSchema } from "./families/bitcoin";
import { EvmTransactionIntentSchema } from "./families/evm";
import { SolanaTransactionIntentSchema } from "./families/solana";
import { TronTransactionIntentSchema } from "./families/tron";

export { AmountWithTickerSchema, BitcoinTransactionIntentSchema };
export { EvmTransactionIntentSchema };
export { SolanaTransactionIntentSchema };
export { TronTransactionIntentSchema };

export const TransactionIntentSchema = z.discriminatedUnion("family", [
  BitcoinTransactionIntentSchema,
  EvmTransactionIntentSchema,
  SolanaTransactionIntentSchema,
  TronTransactionIntentSchema,
]);

export type TransactionIntent = z.infer<typeof TransactionIntentSchema>;
