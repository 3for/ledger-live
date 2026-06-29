import { defineGroup } from "@bunli/core";
import AddressCommand from "./address";
import AppConfigCommand from "./app-config";
import MessageCommand from "./message";

export default defineGroup({
  name: "tron",
  description: "Tron signer diagnostic commands",
  commands: [AddressCommand, AppConfigCommand, MessageCommand],
});
