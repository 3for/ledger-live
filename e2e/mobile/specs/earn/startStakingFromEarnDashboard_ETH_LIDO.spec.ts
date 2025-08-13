import { Provider } from "@ledgerhq/live-common/lib/e2e/enum/Provider";
import { runStartETHStakingFromEarnDashboardTest } from "./earn";

const testConfig = {
  account: Account.ETH_1,
  earnButtonId: "7db7743d-3e2f-592b-b3f8-db5916290ec0",
  provider: Provider.LIDO,
  tmsLinks: ["B2CQA-3676, B2CQA-1713"],
  tags: ["@NanoSP", "@LNS", "@NanoX"],
};

runStartETHStakingFromEarnDashboardTest(
  testConfig.account,
  testConfig.earnButtonId,
  testConfig.provider,
  testConfig.tmsLinks,
  testConfig.tags,
);
