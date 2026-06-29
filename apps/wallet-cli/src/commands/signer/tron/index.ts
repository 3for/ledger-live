import { defineGroup } from "@bunli/core";
import AppConfigCommand from "./app-config";

export default defineGroup({
  name: "tron",
  description: "Tron signer diagnostic commands",
  commands: [AppConfigCommand],
});
