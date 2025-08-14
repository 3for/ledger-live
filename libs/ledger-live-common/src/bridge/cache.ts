import { makeLRUCache } from "@ledgerhq/live-network/cache";
import type { CryptoCurrency } from "@ledgerhq/types-cryptoassets";
import type { BridgeCacheSystem } from "@ledgerhq/types-live";
import { getCurrencyBridge } from "./";
import { LiveConfig } from "@ledgerhq/live-config/LiveConfig";

const defaultCacheStrategy = {
  preloadMaxAge: 5 * 60 * 1000,
};
export function makeBridgeCacheSystem({
  saveData,
  getData,
}: {
  saveData: (currency: CryptoCurrency, data: unknown) => Promise<void>;
  getData: (currency: CryptoCurrency) => Promise<unknown | null | undefined>;
}): BridgeCacheSystem {
  const hydrateCurrency = async (currency: CryptoCurrency) => {
    if (
      currency.useCalLazyLoading === true &&
      LiveConfig.getValueByKey("feature_cal_lazy_loading") === true
    ) {
      return;
    }

    const value = await getData(currency);
    const bridge = getCurrencyBridge(currency);
    bridge.hydrate(value, currency);
    return value;
  };

  const lruCaches = {};

  const prepareCurrency = async (
    currency: CryptoCurrency,
    { forceUpdate }: { forceUpdate: boolean } = { forceUpdate: false },
  ) => {
    if (
      currency.useCalLazyLoading === true &&
      LiveConfig.getValueByKey("feature_cal_lazy_loading") === true
    ) {
      return;
    }

    const bridge = getCurrencyBridge(currency);
    const { preloadMaxAge } = {
      ...defaultCacheStrategy,
      ...(bridge.getPreloadStrategy && bridge.getPreloadStrategy(currency)),
    };
    let cache = lruCaches[currency.id];

    if (!cache || forceUpdate) {
      cache = makeLRUCache(
        async () => {
          const preloaded = await bridge.preload(currency);

          if (preloaded) {
            bridge.hydrate(preloaded, currency);
            await saveData(currency, preloaded);
          }

          return preloaded;
        },
        () => "",
        {
          ttl: preloadMaxAge,
        },
      );
      lruCaches[currency.id] = cache;
    }

    return cache();
  };

  return {
    hydrateCurrency,
    prepareCurrency,
  };
}
