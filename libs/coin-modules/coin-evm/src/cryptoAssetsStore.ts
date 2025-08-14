import type { CryptoAssetsStore, CryptoAssetsStoreGetter } from "@ledgerhq/types-live";

let getStore: CryptoAssetsStoreGetter;
export function setCryptoAssetsStoreGetter(cryptoAssetsStoreGetter: CryptoAssetsStoreGetter): void {
  getStore = cryptoAssetsStoreGetter;
}

export function getCryptoAssetsStore(): CryptoAssetsStore {
  return getStore();
}
