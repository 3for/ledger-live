# @ledgerhq/live-signer-tron

Ledger Wallet Tron signer adapters for legacy LedgerJS transports and Device Management Kit transports.

## API boundaries

`TronSigner` is the bridge-facing contract consumed by `@ledgerhq/coin-tron`.
Keep it limited to the methods used by the coin module:

- `getAddress(path, boolDisplay?)`
- `sign(path, rawTxHex, tokenSignatures)`

`DmkSignerTron` also implements `TronSignerExtended` for direct DMK signer use
cases. The extended API mirrors the public `@ledgerhq/device-signer-kit-tron`
methods: app configuration, ECDH, transaction signing, hash signing, message
signing, and TIP-712 signing.

## Clear-signing contexts

Do not expose signer-tron internal `Provide*Command` classes from this package.
Tron clear-signing data is supplied through public abstractions:

- pass a `TronContextModule` to `new DmkSignerTron(dmk, sessionId, { contextModule })`
- pass explicit `TransactionOptions.contexts` to `signTransaction`
- pass TIP-712 data through `signTypedData` / `signTypedDataHash`

This keeps GCS and context command details owned by `signer-tron`, while Live
only depends on stable public inputs.
