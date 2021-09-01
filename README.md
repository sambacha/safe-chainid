# Safe ChainId

> Note @remarks originally wrote this in a gist.

## Summary

MetaMask can only handle chain IDs of a certain size. Specifically:

```javascript
MAX_SAFE_CHAIN_ID = 4503599627370476;
```

MetaMask (and any program that consumes the same cryptographic libraries that we do) should reject any chain IDs greater than `MAX_SAFE_CHAIN_ID`, and validate chain IDs as follows, after successfully parsing them as `number` values:

```javascript
const MAX_SAFE_CHAIN_ID = 4503599627370476;

function isSafeChainId(chainId) {
  return (
    Number.isSafeInteger(chainId) && chainId > 0 && chainId <= MAX_SAFE_CHAIN_ID
  );
}
```

## Justification

### Problem Statement

At the time of writing, the chain ID is effectively the GUID of Ethereum chains,
and a critical component of transaction signing.
See [EIP-155](https://eips.ethereum.org/EIPS/eip-155) for details.

We are about to complete efforts to require chain IDs for all chains in MetaMask and enforce their use in transaction signing.
(We were already doing this, but there were some edge cases remaining.)

However, you'll notice that EIP-155 says nothing about the _size_ of the chain ID.
Per [EIP-695](https://eips.ethereum.org/EIPS/eip-695),
the chain ID is a `QUANTITY`, which can be (with some possible caveats) any number in the `0` to `2**256` range.

Because JavaScript `number` values are [IEEE 754](https://en.wikipedia.org/wiki/IEEE_754)
double-precision floating point numbers,
they can only safely represent values in the `-(2**53 - 1) <= 2**53 - 1` range.
(We call the upper end of this range the [`MAX_SAFE_INTEGER`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER).)
This means that a chain _could_ specify a chain ID that isn't safely representable as a native JavaScript `number`.

In the extension, we've tried to mitigate this by using `bignumber.js` to validate chain IDs before converting them to hex,
but this is also unsafe because of the signing libraries we use.
Consider the following `ethereumjs-tx` implementations:

- [`ethereumjs-tx@1.3.7`, used by the extension](https://github.com/ethereumjs/ethereumjs-tx/blob/e3fc21467ecb997090f63f154b1407094f173bf2/index.js#L120-L127)
- [`ethereumjs-tx@3.0.0`, the latest version](https://github.com/ethereumjs/ethereumjs-vm/blob/5184804b6652056183babb47ef254d98765c9b8c/packages/tx/src/transaction.ts#L368-L383)

Whether we use `bignumber.js` or something else, our signing libraries expect `number` chain IDs.
The formula they used we get from `ethereumjs-tx@3.0.0`, which we also find in EIP-155:

```javascript
const isValidEIP155V =
  vInt === this.getChainId() * 2 + 35 || vInt === this.getChainId() * 2 + 36;
```

In addition, in [the `ecsign` implementation](https://github.com/ethereumjs/ethereumjs-util/blob/c5dca47d1ec983edd3b00b559088f9b56e16bc01/src/signature.ts#L16-28)
of `ethereumjs-util@7.0.5` (the latest version), we find the following:

```javascript
const sig = ecdsaSign(msgHash, privateKey);
const recovery: number = sig.recid;

const ret = {
  r: Buffer.from(sig.signature.slice(0, 32)),
  s: Buffer.from(sig.signature.slice(32, 64)),
  v: chainId ? recovery + (chainId * 2 + 35) : recovery + 27,
};
```

We don't know what will happen if we provide an unsafe chain ID to a signing method, but presumably, nothing good.
Let's not find out; let's establish a `MAX_SAFE_CHAIN_ID` and enforce it.

Now, `sig.recid` is the ECDSA signature's "recovery id", which per the following sources is a number in the `0 <= 3` range:

- [Ethereum StackExchange](https://ethereum.stackexchange.com/a/53182)
- [The `pycoin` (a Bitcoin library) documentation](https://pycoin.readthedocs.io/en/latest/source/pycoin.ecdsa.html)

In summary:

- The chain ID is used to compute the `v` parameter in various Ethereum signing operations
- Our signing libraries expect the chain ID to be a primitive `JavaScript` number
- The chain ID must not exceed the JavaScript `MAX_SAFE_INTEGER` (`2**53 - 1`) in size

### Calculations

Given the above signing implementations, we can calculate the largest chain ID, `MAX_SAFE_CHAIN_ID`, we can safely handle in MetaMask:

```text
From ethereumjs-util@7.0.5, we have that:

  v = recovery + (chainId * 2 + 35)

Per the above discussion, we also have that:

  int_max = 2**53 - 1
  recovery_max = 3
  chainId_max = ?

Therefore:

  v_max = 3 + (chainId * 2 + 35) = chainId * 2 + 38
    &&
  v_max <= int_max

    ->

  2**53 - 1 = MAX_SAFE_CHAIN_ID * 2 + 38

    ->

  // Since we're dealing with integers, we round down.

  MAX_SAFE_CHAIN_ID = floor( ( 2**53 - 39 ) / 2 ) = 4503599627370476
```

Given the value of the safe chain ID, we can validate all incoming chain IDs as follows, once they're converted to integers:

```javascript
const MAX_SAFE_CHAIN_ID = 4503599627370476;

function isSafeChainId(chainId) {
  return (
    Number.isSafeInteger(chainId) && chainId > 0 && chainId <= MAX_SAFE_CHAIN_ID
  );
}
```
