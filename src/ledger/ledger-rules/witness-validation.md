# Witness Validation

### Key Definitions
**`Witness`**: A witness is a piece of data that allows you to verify the authenticity of the transaction. There are many different witness types, depending on what the transaction requires, such as vkey witnesses, bootstrap witnesses, and script witnesses.

**`Vkey Witness`**: A vkey witness is a specific witness type. It is used to verify that the transaction has the authority to consume a UTxO(s) locked at the assosciated `pkh` address. It includes the signature and the vkey (instead of the key hash, which is encoded in the address).

**`Bootstrap Witness`**: A bootstrap witness is a specific witness type. It is used to verify that the transaction has the authority to consume a UTxO(s) locked at the associated Byron-era address. It includes the assosciated public key, the signature, the 32 byte chain code, and a set of attributes encoded in the address.

*TODO: script witnesses*

### Process

Witness validation is the process of validating that all witnesses are:
1) Valid signatures given the tranasaction hash and the provided public key.
2) Present if required by the transaction. There cannot be any missing witnesses.
3) *TODO: script witness validation*

The process of witness validation is described in section 12.2 of the [Cardano Ledger Specification](https://intersectmbo.github.io/formal-ledger-specifications/cardano-ledger.pdf), in the UTXOW inference rules.

*TODO: provide links to the relevent sections of code in Amaru and Haskell node*


## "Land Mine" #1: Bootstrap Witnesses

### Context
After Shelley introduced the [`bootstrap_witness`](https://github.com/IntersectMBO/cardano-ledger/blob/d71d7923a79cfcde8cac0b5db399a5427524d06a/eras/shelley/impl/cddl-files/shelley.cddl#L296-L301) field to the `transaction_witness_set`. One may reasonably assume that if a Byron-era address is present, the assosciated witness would be found in the `bootstrap_witness` field. However, it is possible to construct a valid transaction such that it includes a Byron-era address, but the `bootstrap_witness` field is an empty list.

### Solution
A node must consider the set of bootstrap root hashes and vkey hashes together when validating that there are no missing required witnesses, instead of isolating the handling of bootstrap addresses and `BootstrapWitness`es from shelley-era addresses and `VkeyWitness`es.

### Example: `0c22edee0ffd7c8f32d2fe4da1f144e9ef78dfb51e1678d5198493a83d6cf8ec`
Consider the following [transaction](https://preprod.cexplorer.io/tx/0c22edee0ffd7c8f32d2fe4da1f144e9ef78dfb51e1678d5198493a83d6cf8ec) on Preprod. In JSON, it looks like this:
```json
{
  "id": "0c22edee0ffd7c8f32d2fe4da1f144e9ef78dfb51e1678d5198493a83d6cf8ec",
  "spends": "inputs",
  "inputs": [
    {
      "transaction": {
        "id": "4a0f0fd2ea2e91b34065e3085448b211afdcf72f9db0b2d74d1f99246e16c860"
      },
      "index": 1
    },
    {
      "transaction": {
        "id": "9157ee358b91c319a2e9dd087fe612d1c3d72d34fa4104bec13c8d37fd40b854"
      },
      "index": 1
    }
  ],
  "outputs": [
    {
      "address": "FHnt4NL7yPXtiYgxWx33wH6JXA9cYxzGAgVG1iMmaX9muBogARkHTRkUox4g4aR",
      "value": {
        "ada": {
          "lovelace": 4832251
        }
      }
    },
    {
      "address": "addr_test1vpfnhjud440uspylt4pewj7uy8tr0adh84sjqgmnq09xssca7lf4g",
      "value": {
        "ada": {
          "lovelace": 5000000
        }
      }
    }
  ],
  "fee": {
    "ada": {
      "lovelace": 167749
    }
  },
  "validityInterval": {},
  "treasury": {},
  "signatories": [
    {
      "key": "b1ef2a278ebe7cfd563c30f1bb642fb6b5616e040792527e6cd58f119895d657",
      "signature": "4110259fb4433f462512d6fa69958070f9e365831962744e7e2e7a2f6a721a707ec4f213ff736fcc195490254dc9d22e0fe0552ae1781b965fc4d05bd5ebb304"
    }
  ],
  "cbor": "84a300828258204a0f0fd2ea2e91b34065e3085448b211afdcf72f9db0b2d74d1f99246e16c860018258209157ee358b91c319a2e9dd087fe612d1c3d72d34fa4104bec13c8d37fd40b85401018282582e82d818582483581c533bcb8dad5fc8049f5d43974bdc21d637f5b73d6120237303ca6843a1024101001a63bbc5a61a0049bbfb82581d60533bcb8dad5fc8049f5d43974bdc21d637f5b73d6120237303ca68431a004c4b40021a00028f45a10081825820b1ef2a278ebe7cfd563c30f1bb642fb6b5616e040792527e6cd58f119895d65758404110259fb4433f462512d6fa69958070f9e365831962744e7e2e7a2f6a721a707ec4f213ff736fcc195490254dc9d22e0fe0552ae1781b965fc4d05bd5ebb304f5f6"
}
```

Notably, there is only one signature, and it is a `VkeyWitness`. Examining the logic that collects required key hashes ([`getShelleyWitsVkeyNeededNoGov`](https://github.com/IntersectMBO/cardano-ledger/blob/d71d7923a79cfcde8cac0b5db399a5427524d06a/eras/shelley/impl/src/Cardano/Ledger/Shelley/UTxO.hs#L226-L249)), the reason becomes apparent:
```hs
inputAuthors :: Set (KeyHash 'Witness)
inputAuthors = foldr' accum Set.empty (txBody ^. spendableInputsTxBodyF)
  where
    accum txin !ans =
      case txinLookup txin utxo' of
        Just txOut ->
          case txOut ^. addrTxOutL of
            Addr _ (KeyHashObj pay) _ -> Set.insert (asWitness pay) ans
            AddrBootstrap bootAddr ->
              Set.insert (asWitness (bootstrapKeyHash bootAddr)) ans
            _ -> ans
        Nothing -> ans
```

The Haskell node is inserting hashes from both `AddrBootstrap` and `Addr` into the same set, since they are both just hash digests of the same size. The hash digest inserted in the case of an `AddrBootstrap` is the bytes that are found at the first field of the `BYRON_ADDRESS_PAYLOAD`. In theory, this is the digest of the `blake2b_224(sha3_256(BYRON_ADDRESS_ROOT))` and that should never be the same digest as a `Addr` vkey hash digest, so there would be no complexity introduced here. However one could, and clearly did, manually construct a Byron-era address where the bytes that are suppose to be the digest of the `BYRON_ADDRESS_ROOT` are instead the digest of a vkey. In that case, a vkey witness present with the assosciated public key would satifsy the required witness, even though that requirement came from an Byron-era bootstrap address.

> [!TIP]
>
> The provided solution already handles this case, but it's worth noting that this could, theoretically, also apply the other direction. If one were to construct a shelley era address where the payment part is the digest of some `BYRON_ADDRESS_ROOT` instead of a verification key, they could have a `BootstrapWitness` present instead of a `VkeyWitness`.
> Author's note: I only just thought of this case while writing up this information and haven't verified that it's true. But, off the top of my head, there is no reason this wouldn't be the case.
