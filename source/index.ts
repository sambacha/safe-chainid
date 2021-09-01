/**
 * @file SafeChainId
 * @version 0.0.1
 * @license Apache-2.0
 * @package safe-chainid
 * @summary  |
 *   exports maxium safe integer metamask can accept for chainId
 *   exports function {isSafeChainId} for checking value's of chainId
 *   exports function {normalizeChainId} for handling chainId as string
 *  @note This is surely a pathalogical and edge case that will rarely be encountered
 */

export enum ChainId {
  MAINNET = 1,
  ROPSTEN = 3,
  RINKEBY = 4,
  GÖRLI = 5,
  KOVAN = 42,
}

/**
 * MAX_SAFE_CHAIN_ID
 * @constant MAX_SAFE_CHAIN_ID
 * @returns {4503599627370476}
 */

export const MAX_SAFE_CHAIN_ID = 4503599627370476;

/**
 * @constant MAX_SAFE_CHAINID
 * @extends MAX_SAFE_CHAIN_ID
 */

export const MAX_SAFE_CHAINID = MAX_SAFE_CHAIN_ID;

/**
 * isSafeChainId
 * @function isSafeChainId
 * @param {number} chainId
 * @returns {any}
 */

export function isSafeChainId(chainId: number) {
  return (
    Number.isSafeInteger(chainId) && chainId > 0 && chainId <= MAX_SAFE_CHAIN_ID
  );
}

/**
 * @function normalizeChainId
 * @param {string|number} chainId
 * @returns {any}
 */

export default function normalizeChainId(chainId: string | number): number {
  if (typeof chainId === 'string') {
    const parsedChainId = Number.parseInt(
      chainId,
      chainId.trim().substring(0, 2) === '0x' ? 16 : 10
    );
    if (Number.isNaN(parsedChainId))
      throw new Error(`!safeChainId ${chainId} is not an integer`);
    return parsedChainId;
  } else {
    if (!Number.isInteger(chainId))
      throw new Error(`!safeChainId ${chainId} is not an integer`);
    return chainId;
  }
}
