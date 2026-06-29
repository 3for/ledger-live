import { defineCommand, option } from "@bunli/core";
import { z } from "zod";
import { createCommandOutput } from "../../../output";
import { networkStringFromCurrencyId, serializeV1, toV0 } from "../../../shared/accountDescriptor";
import { makeEnvelope } from "../../../shared/response";
import { colors, writeStdout } from "../../../shared/ui";
import { WalletAdapter } from "../../../wallet";
import { TransactionIntentSchema } from "../../../wallet/intents";
import {
  accountOption,
  outputOption,
  resolveAccountArg,
  resolveAccountDescriptorV1,
  resolveOutputFormat,
} from "../../inputs";

type PreparedTronTransaction = Awaited<ReturnType<WalletAdapter["prepareTronSend"]>>;

function toSignerPath(path: string): string {
  return path.replace(/^m\//, "").replaceAll("h", "'");
}

function writePreparedHuman(path: string, prepared: PreparedTronTransaction): void {
  writeStdout(`${colors.bold("Path:")} ${path}`);
  writeStdout(`${colors.bold("To:")} ${prepared.recipient}`);
  writeStdout(`${colors.bold("Amount:")} ${prepared.amount}`);
  writeStdout(`${colors.bold("Fees:")} ${prepared.fees}`);
  writeStdout(`${colors.bold("raw_data_hex:")} ${prepared.rawDataHex}`);
}

function writePreparedJson(
  account: string,
  network: string,
  path: string,
  prepared: PreparedTronTransaction,
): void {
  writeStdout(
    JSON.stringify(
      makeEnvelope(
        "signer tron prepare-tx",
        network,
        {
          path,
          recipient: prepared.recipient,
          amount: prepared.amount,
          fee: prepared.fees,
          rawDataHex: prepared.rawDataHex,
        },
        account,
      ),
    ),
  );
}

export default defineCommand({
  name: "prepare-tx",
  description: "Prepare an unsigned Tron raw_data_hex for signer-tron transaction signing",
  options: {
    account: accountOption,
    to: option(z.string().min(1, "Recipient address is required (--to <address>)"), {
      description: "Recipient address",
      short: "t",
    }),
    amount: option(z.string().min(1, "Amount is required (--amount '<value> TRX', e.g. '1 TRX')"), {
      description: "Amount including ticker, e.g. '1 TRX'",
    }),
    output: outputOption,
  },
  handler: async ({ flags, positional }) => {
    const ctx = { command: "signer tron prepare-tx", network: "", account: "" };
    const output = resolveOutputFormat(flags.output);
    const wallet = new WalletAdapter();
    const out = createCommandOutput(output, ctx);

    await out.run(async () => {
      const accountInput = resolveAccountArg(flags.account, positional);
      const descriptorV1 = await resolveAccountDescriptorV1(accountInput);
      const descriptor = toV0(descriptorV1);
      const signerPath = toSignerPath(descriptorV1.path);
      ctx.network = networkStringFromCurrencyId(descriptor.currencyId);
      ctx.account = serializeV1(descriptorV1);

      if (descriptor.currencyId !== "tron") {
        throw new Error(`Expected a Tron account, got ${descriptor.currencyId}.`);
      }

      const intent = TransactionIntentSchema.parse({
        family: "tron",
        recipient: flags.to,
        amount: flags.amount,
      });
      const spin = out.spin("Preparing Tron raw_data_hex...");
      const prepared = await wallet.prepareTronSend(descriptor, intent);
      spin?.success("Prepared Tron raw_data_hex");

      if (output === "json") {
        writePreparedJson(ctx.account, ctx.network, signerPath, prepared);
      } else {
        writePreparedHuman(signerPath, prepared);
      }
    });
  },
});
