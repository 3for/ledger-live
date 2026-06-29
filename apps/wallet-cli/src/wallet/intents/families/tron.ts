import { z } from "zod";
import { AmountWithTickerSchema } from "./bitcoin";

export const TronTransactionIntentSchema = z.object({
  family: z.literal("tron"),
  recipient: z.string(),
  amount: AmountWithTickerSchema,
});
