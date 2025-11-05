import type { LoadConfig } from "./types";

const defaultLoadConfig: Required<LoadConfig> = {
  cryptoassetsBaseURL: "https://cdn.live.ledger.com/cryptoassets",
  calServiceURL: "https://crypto-assets-service.api.ledger.com",
};

export function getLoadConfig(userLoadConfig?: LoadConfig): LoadConfig {
  return {
    ...defaultLoadConfig,
    ...userLoadConfig,
  };
}
