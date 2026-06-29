import { defineGroup } from "@bunli/core";
import TronGroup from "./tron";

export default defineGroup({
  name: "signer",
  description: "Signer diagnostic commands",
  commands: [TronGroup],
});
