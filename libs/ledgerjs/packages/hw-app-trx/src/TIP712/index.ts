import Transport from "@ledgerhq/hw-transport";
import { splitPath } from "../utils";

const CLA = 0xe0;
const HASH_SIZE = 32;
const HASH_HEX_REGEX = /^(?:0x)?[0-9a-fA-F]{64}$/;

const decodeHash = (value: string, label: string): Buffer => {
  const invalidHashError = () =>
    new Error(`Invalid TIP-712 ${label}: expected a 32-byte hexadecimal string.`);

  if (!HASH_HEX_REGEX.test(value)) {
    throw invalidHashError();
  }

  const hash = Buffer.from(value.startsWith("0x") ? value.slice(2) : value, "hex");
  if (hash.length !== HASH_SIZE) {
    throw invalidHashError();
  }

  return hash;
};

export const signTIP712HashedMessage = async (
  transport: Transport,
  path: string,
  domainSeparatorHex: string,
  hashStructMessageHex: string,
): Promise<string> => {
  const domainSeparator = decodeHash(domainSeparatorHex, "domain separator");
  const hashStruct = decodeHash(hashStructMessageHex, "message hash");
  const paths = splitPath(path);
  const buffer = Buffer.alloc(1 + paths.length * 4 + 32 + 32, 0);

  let offset = 0;
  buffer[0] = paths.length;
  paths.forEach((element, index) => {
    buffer.writeUint32BE(element, 1 + 4 * index);
  });

  offset = 1 + 4 * paths.length;
  domainSeparator.copy(buffer, offset);
  offset += 32;
  hashStruct.copy(buffer, offset);

  const response = await transport.send(CLA, 0x0c, 0x00, 0x00, buffer);
  return response.slice(0, 65).toString("hex");
};
