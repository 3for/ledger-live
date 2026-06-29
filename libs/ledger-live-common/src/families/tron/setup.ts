// Goal of this file is to inject all necessary device/signer dependency to coin-modules
import { createBridges } from "@ledgerhq/coin-tron/bridge";
import { TronCoinConfig } from "@ledgerhq/coin-tron/config";
import tronResolver from "@ledgerhq/coin-tron/signer";
import type { CliTools } from "@ledgerhq/coin-tron/test/cli";
import makeCliTools from "@ledgerhq/coin-tron/test/cli";
import type { Transaction, TronAccount, TronSigner } from "@ledgerhq/coin-tron/types/index";
import Transport from "@ledgerhq/hw-transport";
import { DmkSignerTron, LegacySignerTron } from "@ledgerhq/live-signer-tron";
import type { Bridge } from "@ledgerhq/types-live";
import { CreateSigner, createResolver, executeWithSigner } from "../../bridge/setup";
import { getCurrencyConfiguration } from "../../config";
import { isDmkTransport } from "../../hw/dmkUtils";
import { Resolver } from "../../hw/getAddress/types";

let _tronLdmkFFEnabled: boolean = false;

export const setTronLdmkEnabled = (enabled: boolean): void => {
  _tronLdmkFFEnabled = enabled;
};

export const getTronSignerInstance: CreateSigner<TronSigner> = (transport: Transport) => {
  if (isDmkTransport(transport) && _tronLdmkFFEnabled) {
    return new DmkSignerTron(transport.dmk, transport.sessionId);
  }

  return new LegacySignerTron(transport);
};

const getCurrencyConfig = (): TronCoinConfig => getCurrencyConfiguration<TronCoinConfig>("tron");

const bridge: Bridge<Transaction, TronAccount> = createBridges(
  executeWithSigner(getTronSignerInstance),
  getCurrencyConfig,
);

const resolver: Resolver = createResolver(getTronSignerInstance, tronResolver);

const cliTools: CliTools = makeCliTools();

export { bridge, cliTools, resolver };
