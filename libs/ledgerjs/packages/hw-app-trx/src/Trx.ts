/********************************************************************************
 *   Ledger Node JS API
 *   (c) 2016-2017 Ledger
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ********************************************************************************/
// FIXME drop:
import { splitPath, decodeVarintBigInt } from "./utils";
import type Transport from "@ledgerhq/hw-transport";
import { signTIP712HashedMessage } from "./TIP712";

const remapTransactionRelatedErrors = e => {
  if (e && e.statusCode === 0x6a80) {
    // TODO:
  }

  return e;
};

const PATH_SIZE = 4;
const PATHS_LENGTH_SIZE = 1;
const CLA = 0xe0;
const ADDRESS = 0x02;
const SIGN = 0x04;
const SIGN_HASH = 0x05;
const SIGN_MESSAGE = 0x08;
const ECDH_SECRET = 0x0a;
const VERSION = 0x06;
const CHUNK_SIZE = 250;
const TRANSACTION_HASH_SIZE = 32;
const ECDH_PUBLIC_KEY_SIZE = 65;
const UNCOMPRESSED_PUBLIC_KEY_PREFIX = "04";
const MAX_UINT32 = 0xffffffff;
// Matches java-tron's consensus-level serialized transaction limit.
const MAX_TRANSACTION_RAW_DATA_SIZE = 500 * 1024;
const MAX_PERSONAL_MESSAGE_SIZE = Math.min(MAX_TRANSACTION_RAW_DATA_SIZE, MAX_UINT32);
const MAX_TRANSACTION_FIELDS = 4096;
// app-tron accepts either two 113-byte TokenDetails messages or one 205-byte ExchangeDetails.
const MAX_TOKEN_SIGNATURES = 2;
const MAX_TOKEN_DETAILS_SIZE = 113;
const MAX_TOKEN_SIGNATURE_SIZE = CHUNK_SIZE;
const MAX_TOKEN_SIGNATURES_TOTAL_SIZE = MAX_TOKEN_SIGNATURES * MAX_TOKEN_DETAILS_SIZE;
const HEX_REGEX = /^[0-9a-fA-F]+$/;

const decodeExactHex = (
  value: string,
  label: string,
  size: number,
  expectedPrefix?: string,
): Buffer => {
  const prefixRequirement = expectedPrefix ? ` starting with ${expectedPrefix}` : "";
  const errorMessage = `Invalid ${label}: expected an unprefixed ${size}-byte hexadecimal string${prefixRequirement}.`;

  if (
    value.length !== size * 2 ||
    !HEX_REGEX.test(value) ||
    (expectedPrefix !== undefined && !value.startsWith(expectedPrefix))
  ) {
    throw new Error(errorMessage);
  }

  const buffer = Buffer.from(value, "hex");
  if (buffer.length !== size) {
    throw new Error(errorMessage);
  }

  return buffer;
};

const decodeBoundedHex = (value: string, label: string, maxSize: number): Buffer => {
  if (value.length > maxSize * 2) {
    throw new Error(`${label} exceeds maximum size of ${maxSize} bytes.`);
  }
  if (value.length === 0 || value.length % 2 !== 0 || !HEX_REGEX.test(value)) {
    throw new Error(`Invalid ${label.toLowerCase()} hex.`);
  }

  return Buffer.from(value, "hex");
};

const getPersonalMessageSize = (messageHex: string): number => {
  if (messageHex.length > MAX_UINT32 * 2) {
    throw new Error("Personal message exceeds firmware uint32 length.");
  }
  if (messageHex.length > MAX_PERSONAL_MESSAGE_SIZE * 2) {
    throw new Error(
      `Personal message exceeds maximum size of ${MAX_PERSONAL_MESSAGE_SIZE} bytes.`,
    );
  }
  if (
    messageHex.length % 2 !== 0 ||
    (messageHex.length > 0 && !HEX_REGEX.test(messageHex))
  ) {
    throw new Error("Invalid personal message hex.");
  }

  return messageHex.length / 2;
};

const getTransactionP1 = (
  chunkIndex: number,
  transactionChunkCount: number,
  tokenSignatureCount: number,
): number => {
  if (transactionChunkCount === 1 && tokenSignatureCount === 0) return 0x10;
  if (chunkIndex === 0) return 0x00;
  if (chunkIndex === transactionChunkCount - 1 && tokenSignatureCount === 0) return 0x90;
  return 0x80;
};
/**
 * Tron API
 *
 * @example
 * import Trx from "@ledgerhq/hw-app-trx";
 * const trx = new Trx(transport)
 */

export default class Trx {
  transport: Transport;

  constructor(transport: Transport, scrambleKey = "TRX") {
    this.transport = transport;
    transport.decorateAppAPIMethods(
      this,
      [
        "getAddress",
        "getECDHPairKey",
        "signTransaction",
        "signTransactionHash",
        "signPersonalMessage",
        "signTIP712HashedMessage",
        "getAppConfiguration",
      ],
      scrambleKey,
    );
  }

  /**
   * get Tron address for a given BIP 32 path.
   * @param path a path in BIP 32 format
   * @option boolDisplay optionally enable or not the display
   * @option boolChaincode optionally enable or not the chaincode request (see app-tron `P2_CHAINCODE` / `helper_send_response_pubkey`)
   * @return an object with a publicKey, address and (optionally) chainCode
   * @example
   * const address = await tron.getAddress("44'/195'/0'/0/0").then(o => o.address)
   */
  getAddress(
    path: string,
    boolDisplay?: boolean,
    boolChaincode?: boolean,
  ): Promise<{
    publicKey: string;
    address: string;
    chainCode?: string;
  }> {
    const paths = splitPath(path);
    const buffer = Buffer.alloc(PATHS_LENGTH_SIZE + paths.length * PATH_SIZE);
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    return this.transport
      .send(CLA, ADDRESS, boolDisplay ? 0x01 : 0x00, boolChaincode ? 0x01 : 0x00, buffer)
      .then(response => {
        const publicKeyLength = response[0];
        const addressLength = response[1 + publicKeyLength];

        return {
          publicKey: response.slice(1, 1 + publicKeyLength).toString("hex"),
          address: response
            .slice(1 + publicKeyLength + 1, 1 + publicKeyLength + 1 + addressLength)
            .toString("ascii"),
          chainCode: boolChaincode
            ? response
                .slice(
                  1 + publicKeyLength + 1 + addressLength,
                  1 + publicKeyLength + 1 + addressLength + 32,
                )
                .toString("hex")
            : undefined,
        };
      });
  }

  getNextLength(tx: Buffer): number {
    const field = decodeVarintBigInt(tx, 0);
    const data = decodeVarintBigInt(tx, field.pos);
    const nextLength =
      (field.value & 0x07n) === 0n ? data.pos : Number(data.value + BigInt(data.pos));

    if (!Number.isSafeInteger(nextLength) || nextLength <= 0 || nextLength > tx.length) {
      throw new Error("Invalid transaction field length.");
    }

    return nextLength;
  }

  private getTransactionChunkCount(tx: Buffer, firstChunkSize: number): number {
    let offset = 0;
    let chunkSize = firstChunkSize;
    let chunkCount = 1;
    let fieldCount = 0;

    while (offset < tx.length) {
      const fieldLength = this.getNextLength(tx.subarray(offset));
      if (fieldLength > CHUNK_SIZE) throw new Error("Too many bytes to encode.");

      fieldCount += 1;
      if (fieldCount > MAX_TRANSACTION_FIELDS) {
        throw new Error("Too many transaction fields.");
      }

      if (chunkSize + fieldLength > CHUNK_SIZE) {
        chunkCount += 1;
        chunkSize = 0;
      }

      chunkSize += fieldLength;
      offset += fieldLength;
    }

    return chunkCount;
  }

  /**
   * sign a Tron transaction with a given BIP 32 path and Token Names
   *
   * @param path a path in BIP 32 format
   * @param rawTxHex a raw transaction hex string
   * @param tokenSignatures Tokens Signatures array
   * @option version pack message based on ledger firmware version
   * @option smartContract boolean hack to set limit buffer on ledger device
   * @return a signature as hex string
   * @example
   * const signature = await tron.signTransaction("44'/195'/0'/0/0", "0a02f5942208704dda506d59dceb40f0f4978f802e5a69080112650a2d747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e5472616e73666572436f6e747261637412340a1541978dbd103cfe59c35e753d09dd44ae1ae64621c7121541e2ae49db6a70b9b4757d2137a43b69b24a445780188ef8b5ba0470cbb5948f802e", [], 105);
   */
  signTransaction(path: string, rawTxHex: string, tokenSignatures: string[]): Promise<string> {
    const paths = splitPath(path);
    const rawTx = decodeBoundedHex(rawTxHex, "Raw transaction", MAX_TRANSACTION_RAW_DATA_SIZE);
    const signatures = tokenSignatures ?? [];
    if (signatures.length > MAX_TOKEN_SIGNATURES) {
      throw new Error("Too many token signatures.");
    }

    let tokenSignaturesTotalSize = 0;
    const tokenSignatureBuffers = signatures.map(signature => {
      const buffer = decodeBoundedHex(signature, "Token signature", MAX_TOKEN_SIGNATURE_SIZE);
      tokenSignaturesTotalSize += buffer.length;
      if (tokenSignaturesTotalSize > MAX_TOKEN_SIGNATURES_TOTAL_SIZE) {
        throw new Error(
          `Token signatures exceed maximum total size of ${MAX_TOKEN_SIGNATURES_TOTAL_SIZE} bytes.`,
        );
      }
      return buffer;
    });

    const pathData = Buffer.alloc(PATHS_LENGTH_SIZE + paths.length * PATH_SIZE);
    // write path for first chunk only
    pathData[0] = paths.length;
    paths.forEach((element, index) => {
      pathData.writeUInt32BE(element, 1 + 4 * index);
    });
    const transactionChunkCount = this.getTransactionChunkCount(rawTx, pathData.length);

    const send = async (): Promise<string> => {
      let response: Buffer = Buffer.alloc(0);
      let offset = 0;
      let chunkIndex = 0;
      let data: Buffer = pathData;

      while (offset < rawTx.length) {
        const fieldLength = this.getNextLength(rawTx.subarray(offset));
        if (data.length + fieldLength > CHUNK_SIZE) {
          response = await this.transport.send(
            CLA,
            SIGN,
            getTransactionP1(chunkIndex, transactionChunkCount, tokenSignatureBuffers.length),
            0x00,
            data,
          );
          chunkIndex += 1;
          data = Buffer.alloc(0);
        }

        data = Buffer.concat([data, rawTx.subarray(offset, offset + fieldLength)]);
        offset += fieldLength;
      }

      response = await this.transport.send(
        CLA,
        SIGN,
        getTransactionP1(chunkIndex, transactionChunkCount, tokenSignatureBuffers.length),
        0x00,
        data,
      );

      for (let index = 0; index < tokenSignatureBuffers.length; index += 1) {
        const isLast = index === tokenSignatureBuffers.length - 1;
        const p1 = 0xa0 | index | (isLast ? 0x08 : 0x00); // eslint-disable-line no-bitwise
        response = await this.transport.send(
          CLA,
          SIGN,
          p1,
          0x00,
          tokenSignatureBuffers[index],
        );
      }

      return response.subarray(0, 65).toString("hex");
    };

    return send().catch(e => {
      throw remapTransactionRelatedErrors(e);
    });
  }

  /**
   * sign a Tron transaction hash with a given BIP 32 path
   *
   * @param path a path in BIP 32 format
   * @param rawTxHashHex an unprefixed 32-byte transaction hash hex string
   * @return a signature as hex string
   * @example
   * const signature = await tron.signTransactionHash("44'/195'/0'/0/0", "25b18a55f86afb10e7aca38d0073d04c80397c6636069193953fdefaea0b8369");
   */
  signTransactionHash(path: string, rawTxHashHex: string): Promise<string> {
    const paths = splitPath(path);
    const transactionHash = decodeExactHex(
      rawTxHashHex,
      "transaction hash",
      TRANSACTION_HASH_SIZE,
    );
    let data = Buffer.alloc(PATHS_LENGTH_SIZE + paths.length * PATH_SIZE);
    data[0] = paths.length;
    paths.forEach((element, index) => {
      data.writeUInt32BE(element, 1 + 4 * index);
    });
    data = Buffer.concat([data, transactionHash]);
    return this.transport.send(CLA, SIGN_HASH, 0x00, 0x00, data).then(response => {
      return response.slice(0, 65).toString("hex");
    });
  }

  /**
   * get the version of the Tron app installed on the hardware device
   *
   * @return an object with a version
   * @example
   * const result = await tron.getAppConfiguration();
   * {
   *   "version": "0.1.5",
   *   "versionN": "105".
   *   "allowData": false,
   *   "allowContract": false,
   *   "truncateAddress": false,
   *   "signByHash": false
   * }
   */
  getAppConfiguration(): Promise<{
    allowContract: boolean;
    truncateAddress: boolean;
    allowData: boolean;
    signByHash: boolean;
    version: string;
    versionN: number;
  }> {
    return this.transport.send(CLA, VERSION, 0x00, 0x00).then(response => {
      // eslint-disable-next-line no-bitwise
      const signByHash = (response[0] & (1 << 3)) > 0;
      // eslint-disable-next-line no-bitwise
      let truncateAddress = (response[0] & (1 << 2)) > 0;
      // eslint-disable-next-line no-bitwise
      let allowContract = (response[0] & (1 << 1)) > 0;
      // eslint-disable-next-line no-bitwise
      let allowData = (response[0] & (1 << 0)) > 0;

      if (response[1] === 0 && response[2] === 1 && response[3] < 2) {
        allowData = true;
        allowContract = false;
      }

      if (response[1] === 0 && response[2] === 1 && response[3] < 5) {
        truncateAddress = false;
      }

      const result = {
        version: `${response[1]}.${response[2]}.${response[3]}`,
        versionN: response[1] * 10000 + response[2] * 100 + response[3],
        allowData,
        allowContract,
        truncateAddress,
        signByHash,
      };
      return result;
    });
  }

  /**
   * sign a Tron Message with a given BIP 32 path
   *
   * @param path a path in BIP 32 format
   * @param message hex string to sign
   * @return a signature as hex string
   * @example
   * const signature = await tron.signPersonalMessage("44'/195'/0'/0/0", "43727970746f436861696e2d54726f6e5352204c6564676572205472616e73616374696f6e73205465737473");
   */
  signPersonalMessage(path: string, messageHex: string): Promise<string> {
    const paths = splitPath(path);
    const messageSize = getPersonalMessageSize(messageHex);

    const send = async (): Promise<string> => {
      const pathDataSize = PATHS_LENGTH_SIZE + paths.length * PATH_SIZE;
      const firstChunkCapacity = CHUNK_SIZE - pathDataSize - 4;
      const firstChunkSize = Math.min(messageSize, firstChunkCapacity);
      const firstChunk = Buffer.alloc(pathDataSize + 4 + firstChunkSize);

      firstChunk[0] = paths.length;
      paths.forEach((element, index) => {
        firstChunk.writeUInt32BE(element, PATHS_LENGTH_SIZE + PATH_SIZE * index);
      });
      firstChunk.writeUInt32BE(messageSize, pathDataSize);
      firstChunk.write(
        messageHex.slice(0, firstChunkSize * 2),
        pathDataSize + 4,
        firstChunkSize,
        "hex",
      );

      let response = await this.transport.send(CLA, SIGN_MESSAGE, 0x00, 0x00, firstChunk);
      let offset = firstChunkSize;

      while (offset < messageSize) {
        const chunkSize = Math.min(CHUNK_SIZE, messageSize - offset);
        const chunk = Buffer.alloc(chunkSize);
        chunk.write(
          messageHex.slice(offset * 2, (offset + chunkSize) * 2),
          0,
          chunkSize,
          "hex",
        );

        response = await this.transport.send(CLA, SIGN_MESSAGE, 0x80, 0x00, chunk);
        offset += chunkSize;
      }

      return response.slice(0, 65).toString("hex");
    };

    return send();
  }

  /**
   * Sign a typed data. The host computes the domain separator and hashStruct(message)
   * @example
     const signature = await tronApp.signTIP712HashedMessage("44'/195'/0'/0/0",Buffer.from( "0101010101010101010101010101010101010101010101010101010101010101").toString("hex"), Buffer.from("0202020202020202020202020202020202020202020202020202020202020202").toString("hex"));
   */
  signTIP712HashedMessage(path: string, domainSeparatorHex: string, hashStructMessageHex: string) {
    return signTIP712HashedMessage(this.transport, path, domainSeparatorHex, hashStructMessageHex);
  }

  /**
   * get Tron address for a given BIP 32 path.
   * @param path a path in BIP 32 format
   * @param publicKey an unprefixed 65-byte uncompressed public key hex string
   * @return shared key hex string,
   * @example
   * const signature = await tron.getECDHPairKey("44'/195'/0'/0/0", "04ff21f8e64d3a3c0198edfbb7afdc79be959432e92e2f8a1984bb436a414b8edcec0345aad0c1bf7da04fd036dd7f9f617e30669224283d950fab9dd84831dc83");
   */
  getECDHPairKey(path: string, publicKey: string): Promise<string> {
    const paths = splitPath(path);
    const data = decodeExactHex(
      publicKey,
      "ECDH public key",
      ECDH_PUBLIC_KEY_SIZE,
      UNCOMPRESSED_PUBLIC_KEY_PREFIX,
    );
    const buffer = Buffer.alloc(1 + paths.length * 4 + data.length);
    buffer[0] = paths.length;
    paths.forEach((element, index) => {
      buffer.writeUInt32BE(element, 1 + 4 * index);
    });
    data.copy(buffer, 1 + 4 * paths.length, 0, data.length);
    return this.transport
      .send(CLA, ECDH_SECRET, 0x00, 0x01, buffer)
      .then(response => response.slice(0, 65).toString("hex"));
  }
}
