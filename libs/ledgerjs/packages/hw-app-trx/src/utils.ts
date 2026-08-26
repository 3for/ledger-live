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
type Defer<T> = {
  promise: Promise<T>;
  resolve: (arg0: T) => void;
  reject: (arg0: any) => void;
};
export function defer<T>(): Defer<T> {
  let resolve, reject;
  const promise = new Promise<T>(function (success, failure) {
    resolve = success;
    reject = failure;
  });
  if (!resolve || !reject) throw "defer() error"; // this never happens and is just to make flow happy

  return {
    promise,
    resolve,
    reject,
  };
}
const MAX_BIP32_PATH_LENGTH = 10;
const MAX_BIP32_PATH_COMPONENT_LENGTH = 11;
const MAX_BIP32_PATH_STRING_LENGTH =
  2 +
  MAX_BIP32_PATH_LENGTH * MAX_BIP32_PATH_COMPONENT_LENGTH +
  (MAX_BIP32_PATH_LENGTH - 1);
const MAX_BIP32_CHILD_INDEX = 0x7fffffff;
const HARDENED_BIP32_OFFSET = 0x80000000;
const BIP32_PATH_COMPONENT_REGEX = /^(\d+)('?)$/;

export function splitPath(path: string): number[] {
  if (path.length > MAX_BIP32_PATH_STRING_LENGTH) {
    throw new Error(`BIP32 path exceeds maximum length of ${MAX_BIP32_PATH_STRING_LENGTH}.`);
  }

  const pathWithoutRoot = path.startsWith("m/") || path.startsWith("M/") ? path.slice(2) : path;
  const components = pathWithoutRoot.length === 0 ? [] : pathWithoutRoot.split("/");
  if (components.length < 1 || components.length > MAX_BIP32_PATH_LENGTH) {
    throw new Error(
      `BIP32 path must contain between 1 and ${MAX_BIP32_PATH_LENGTH} elements.`,
    );
  }

  return components.map(component => {
    const match = BIP32_PATH_COMPONENT_REGEX.exec(component);
    if (!match) {
      throw new Error(`Invalid BIP32 path component: ${component}.`);
    }

    const index = Number(match[1]);
    if (!Number.isSafeInteger(index) || index > MAX_BIP32_CHILD_INDEX) {
      throw new Error(`BIP32 path component is out of range: ${component}.`);
    }

    return match[2] === "'" ? index + HARDENED_BIP32_OFFSET : index;
  });
}
// TODO use async await
export function eachSeries<A>(arr: A[], fun: (arg0: A) => Promise<any>): Promise<any> {
  return arr.reduce((p, e) => p.then(() => fun(e)), Promise.resolve());
}
export function foreach<T, A>(
  arr: T[],
  callback: (arg0: T, arg1: number) => Promise<A>,
): Promise<A[]> {
  function iterate(index, array, result) {
    if (index >= array.length) {
      return result;
    } else
      return callback(array[index], index).then(function (res) {
        result.push(res);
        return iterate(index + 1, array, result);
      });
  }

  return Promise.resolve().then(() => iterate(0, arr, []));
}
export function doIf(condition: boolean, callback: () => any | Promise<any>): Promise<void> {
  return Promise.resolve().then(() => {
    if (condition) {
      return callback();
    }
  });
}
export function asyncWhile<T>(
  predicate: () => boolean,
  callback: () => Promise<T>,
): Promise<Array<T>> {
  function iterate(result) {
    if (!predicate()) {
      return result;
    } else {
      return callback().then(res => {
        result.push(res);
        return iterate(result);
      });
    }
  }

  return Promise.resolve([]).then(iterate);
}
interface DecodeResult {
  value: number;
  pos: number;
}
interface BigIntDecodeResult {
  value: bigint;
  pos: number;
}

export function decodeVarintBigInt(stream: Buffer, index: number): BigIntDecodeResult {
  if (!Number.isSafeInteger(index) || index < 0 || index >= stream.length) {
    throw new Error("Invalid varint index.");
  }

  let result = 0n;
  let pos = index;

  for (let byteIndex = 0; byteIndex < 10; byteIndex += 1) {
    if (pos >= stream.length) {
      throw new Error("Unexpected end of buffer when decoding varint.");
    }

    const b = stream[pos];
    if (byteIndex === 9 && (b & 0xfe) !== 0) {
      throw new Error("Too many bytes when decoding varint.");
    }

    result |= BigInt(b & 0x7f) << BigInt(byteIndex * 7);
    pos += 1;

    if (!(b & 0x80)) {
      return {
        value: result,
        pos,
      };
    }
  }

  throw new Error("Too many bytes when decoding varint.");
}

export function decodeVarint(stream: Buffer, index: number): DecodeResult {
  const decoded = decodeVarintBigInt(stream, index);
  const value = Number(decoded.value);

  if (!Number.isSafeInteger(value)) {
    throw new Error("Varint exceeds JavaScript safe integer range.");
  }

  return { value, pos: decoded.pos };
}

export const padHexString = (str: string) => {
  return str.length % 2 ? "0" + str : str;
};

export function hexBuffer(str: string): Buffer {
  const strWithoutPrefix = str.startsWith("0x") ? str.slice(2) : str;
  return Buffer.from(padHexString(strWithoutPrefix), "hex");
}
