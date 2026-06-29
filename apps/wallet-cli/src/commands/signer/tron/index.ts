import { defineGroup } from "@bunli/core";
import AddressCommand from "./address";
import AppConfigCommand from "./app-config";
import MessageCommand from "./message";
import PrepareTxCommand from "./prepare-tx";
import TypedDataCommand from "./typed-data";
import TypedDataHashCommand from "./typed-data-hash";
import TxCommand from "./tx";
import TxHashCommand from "./tx-hash";

export default defineGroup({
  name: "tron",
  description: "Tron signer diagnostic commands",
  commands: [
    AddressCommand,
    AppConfigCommand,
    MessageCommand,
    PrepareTxCommand,
    TypedDataCommand,
    TypedDataHashCommand,
    TxCommand,
    TxHashCommand,
  ],
});
