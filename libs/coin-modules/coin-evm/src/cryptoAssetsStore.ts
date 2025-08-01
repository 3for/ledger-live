import {
  CryptoAssetsStore,
  CryptoAssetsStoreGetter,
} from "@ledgerhq/types-live/lib/crypto-assets/type";

let getStore: CryptoAssetsStoreGetter;
export function setCryptoAssetsStoreGetter(cryptoAssetsStoreGetter: CryptoAssetsStoreGetter): void {
  getStore = cryptoAssetsStoreGetter;
}

export function getCryptoAssetsStore(): CryptoAssetsStore {
  return getStore();
}
