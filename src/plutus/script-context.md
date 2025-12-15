# Script Context
A `ScriptContext` is an *unspecified* data structure passed as an argument to every Plutus validator during evaluation. In general, it contains information about the transaction in which the script is being validated, though the specifics depend on the validator's Plutus version. The `ScriptContext` is what allows complex logic to be executed on-chain. For example, a validator that only allows spending if Bob's signature is required, would read the required signers from the `ScriptContext` and check for the presence of Bob's public key hash.

## Versions
While the actual data and the encoding of the data depends on the Plutus version, they all contain at least a `TxInfo` and a data structure that specifies which script is being evaluated, since a transaction could have several.

Since these data structures are entirely unspecified, it is very important to use the Haskell implementation as the reference implementation.

### Plutus V1
```haskell
-- | The context that the currently-executing script can access.
data ScriptContext = ScriptContext
  { scriptContextTxInfo :: TxInfo
  -- ^ information about the transaction the currently-executing script is included in
  , scriptContextPurpose :: ScriptPurpose
  -- ^ the purpose of the currently-executing script
  }

data TxInfo = TxInfo
  { txInfoInputs :: List TxInInfo
  , -- \^ Transaction inputs; cannot be an empty list
  txInfoOutputs :: List TxOut
  , -- \^ Transaction outputs
  txInfoFee :: Value
  , -- \^ The fee paid by this transaction.
  txInfoMint :: Value
  , -- \^ The 'Value' minted by this transaction.
  txInfoDCert :: List DCert
  , -- \^ Digests of certificates included in this transaction
  -- TODO: is this a map? is this a list?
  txInfoWdrl :: List (StakingCredential, Integer)
  -- , -- \^ Withdrawals
  txInfoValidRange :: POSIXTimeRange
  , -- \^ The valid range for the transaction.
  txInfoSignatories :: List PubKeyHash
  , -- \^ Signatures provided with the transaction, attested that they all signed the tx
  -- TODO: is this a map? is this a list?
  txInfoData :: List (DatumHash, Datum)
  , -- \^ The lookup table of datums attached to the transaction
  txInfoId :: TxId
  }
    
data ScriptPurpose
  = Minting CurrencySymbol
  | Spending TxOutRef
  | Rewarding StakingCredential
  | Certifying DCert
```

### Plutus V2
Introduced in the Babbage era, the differences between Plutus V1 and Plutus V2 include, but are not limited to: reference inputs, redeemers, inline datums, and some changes to the underlying data structures used. There were some changes in how data is serialized as `PlutusData`.
```haskell
-- | The context that the currently-executing script can access.
data ScriptContext = ScriptContext
  { scriptContextTxInfo :: TxInfo
  -- ^ information about the transaction the currently-executing script is included in
  , scriptContextPurpose :: ScriptPurpose
  -- ^ the purpose of the currently-executing script
  }

data TxInfo = TxInfo
  { txInfoInputs :: [TxInInfo]
  -- ^ Transaction inputs; cannot be an empty list
  , txInfoReferenceInputs :: [TxInInfo]
  -- ^ /Added in V2:/ Transaction reference inputs
  , txInfoOutputs :: [TxOut]
  -- ^ Transaction outputs
  , txInfoFee :: Value
  -- ^ The fee paid by this transaction.
  , txInfoMint :: Value
  -- ^ The 'Value' minted by this transaction.
  , txInfoDCert :: [DCert]
  -- ^ Digests of certificates included in this transaction
  , txInfoWdrl :: Map StakingCredential Integer
  {-^ Withdrawals
  /V1->V2/: changed from assoc list to a 'PlutusTx.AssocMap' -}
  , txInfoValidRange :: POSIXTimeRange
  -- ^ The valid range for the transaction.
  , txInfoSignatories :: [PubKeyHash]
  -- ^ Signatures provided with the transaction, attested that they all signed the tx
  , txInfoRedeemers :: Map ScriptPurpose Redeemer
  -- ^ /Added in V2:/ a table of redeemers attached to the transaction
  , txInfoData :: Map DatumHash Datum
  {-^ The lookup table of datums attached to the transaction
  /V1->V2/: changed from assoc list to a 'PlutusTx.AssocMap' -}
  , txInfoId :: TxId
  -- ^ Hash of the pending transaction body (i.e. transaction excluding witnesses)
  }

data ScriptPurpose
    = Minting CurrencySymbol
    | Spending TxOutRef
    | Rewarding StakingCredential
    | Certifying DCert
```

### Plutus V3
Introduced in the Conway era, Plutus V3 introduced more significant changes including, but not limited to, governance data, a restructuring of the script arguments, and different `PlutusData` serialization.
```haskell
data ScriptContext = ScriptContext
  { scriptContextTxInfo :: TxInfo
  -- ^ information about the transaction the currently-executing script is included in
  , scriptContextRedeemer :: V2.Redeemer
  -- ^ Redeemer for the currently-executing script
  , scriptContextScriptInfo :: ScriptInfo
  {-^ the purpose of the currently-executing script, along with information associated
  with the purpose -}
  }

data TxInfo = TxInfo
  { txInfoInputs :: [TxInInfo]
  , txInfoReferenceInputs :: [TxInInfo]
  , txInfoOutputs :: [V2.TxOut]
  , txInfoFee :: V2.Lovelace
  , txInfoMint :: V3.MintValue
  {-^ The 'Value' minted by this transaction.

  /Invariant:/ This field does not contain Ada with zero quantity, unlike
  their namesakes in Plutus V1 and V2's ScriptContexts. -}
  , txInfoTxCerts :: [TxCert]
  , txInfoWdrl :: Map V2.Credential V2.Lovelace
  , txInfoValidRange :: V2.POSIXTimeRange
  , txInfoSignatories :: [V2.PubKeyHash]
  , txInfoRedeemers :: Map ScriptPurpose V2.Redeemer
  , txInfoData :: Map V2.DatumHash V2.Datum
  , txInfoId :: V3.TxId
  , txInfoVotes :: Map Voter (Map GovernanceActionId Vote)
  , txInfoProposalProcedures :: [ProposalProcedure]
  , txInfoCurrentTreasuryAmount :: Haskell.Maybe V2.Lovelace
  , txInfoTreasuryDonation :: Haskell.Maybe V2.Lovelace
  }

-- | Like `ScriptPurpose` but with an optional datum for spending scripts.
data ScriptInfo
  = MintingScript V2.CurrencySymbol
  | SpendingScript V3.TxOutRef (Haskell.Maybe V2.Datum)
  | RewardingScript V2.Credential
  | CertifyingScript
      Haskell.Integer
      -- ^ 0-based index of the given `TxCert` in `txInfoTxCerts`
      TxCert
  | VotingScript Voter
  | ProposingScript
      Haskell.Integer
      -- ^ 0-based index of the given `ProposalProcedure` in `txInfoProposalProcedures`
```

## Conformance Testing
It is vital that every node construct byte-for-byte the exact same `ScriptContext` for a given script evaluation. If there were any differences in the `PlutusData` encoding, the ordering of fields and/or values, or included data, a script evaluation could produce a different result, causing a fork in the network. This is why alternative node implementations **must** test their implementations against the reference Haskell implementation.

This section will describe the strategy that Amaru has been using, in hopes that it can provide a basis for a shared conformance testing suite going forward. These tests follow a basic pattern of providing transaction bytes and a slice of ledger state and comparing the produced `ScriptContext` to the expected `ScriptContext`.


### Test Vectors
Each test vector is a self-contained JSON object with three sections:

**Meta** contains the test identifier and target Plutus version:
```json
{
  "title": "simple_send",
  "description": "A single script-locked input being spent with a simple datum & redeemer",
  "plutus_version": 3
}
```

**Input** provides everything needed to construct the ScriptContext:
- `transaction`: The full transaction encoded as CBOR hex. This is decoded to extract the transaction body (inputs, outputs, mint, certificates, etc.) and the witness set (scripts, redeemers, datums).
- `utxo`: An array of resolved UTxOs that the transaction references as inputs. Each entry contains the output reference (transaction ID + index), the address, value, and optionally a datum. These are necessary because the `ScriptContext` includes full input details, not just references. 
```json
{
  "transaction": "84a700818258200000...",
  "utxo": [
    {
      "transaction": { "id": "0000...0000" },
      "index": 0,
      "address": "7024BDE2E2FEDA3D39DA243E518B8D49D0C77CE209B91C92086234246C",
      "value": { "ada": { "lovelace": 1000000000 } },
      "datum": "D87980"
    }
  ]
}
```

*Expectations* contains the expected output:
- `script_context`: The `ScriptContext` serialized as `PlutusData` and encoded as CBOR hex. This is what your implementation should produce.
```json
{
    "expectations": {
      "script_context": "d8799..."
    }
}
```
### How to Use the Tests

1. **Decode** the transaction from the CBOR hex in input.transaction. This gives you the transaction body and witness set.
2. **Build** the UTxO map from input.utxo. Map each output reference (`txid` + `index`) to its resolved output (`address`, `value`, `datum`).
3. **Construct** `TxInfo` from the transaction body and resolved UTxOs. This involves:
  - Resolving each input reference to its full output data
  - Converting the validity interval from slots to POSIX time (requires era history)
  - Normalizing and sorting inputs lexicographically by output reference
  - Processing certificates, withdrawals, mints, etc.
4. **For each redeemer**, build a `ScriptContext` by combining TxInfo with the script purpose derived from the redeemer's tag and index.
5. **Serialize** to `PlutusData` using the version-specific encoding (V1, V2, or V3). The structure and field ordering differ between versions.
6. **Encode** as CBOR and compare the hex string against `expectations.script_context`. An exact match indicates conformance.

Notably, these test vectors don't specify which script evaluation the `ScriptContext` is being constructed for. Until these are improved, one should check that *any* of the produced `ScriptContext`s match the `expectations.script_context`.


### How Tests Were Produced
Matthias Benkort modified [`Ogmios`](https://github.com/CardanoSolutions/ogmios) to construct a `ScriptContext` for a given transaction. He provided mock `utxo` data, which is irrelevant as one just needs to make sure an alternative implementation produces the same `ScriptContext` for the same transation and ledger state slice. The initial set of tests are very minimal, but we plan to introduce many more tests as we iterate and improve the Amaru implementation.
