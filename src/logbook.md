Logbook about `cardano-blueprint` that contains thinking, discussions, pains, joys, events, and experiences that happen on a daily basis. It is supposed to be a kind of [Stream of consciousness](https://en.wikipedia.org/wiki/Stream_of_consciousness) that can later be searched, linked to or reviewed. It may also be used as a very informal decision log.

## 2025-03-25

By @ch1bo

- Met with Pi, Matthias and Josh to discuss ledger test approaches and how they relate to cardano blueprint
- Ethan, someone from SundaeLabs, would be free soon and could spend some time putting together a conformance test suite
- Most relevant issue: https://github.com/IntersectMBO/cardano-ledger/issues/4892
- On ledger state
  - While we wait for Ethan I briefly mentioned that the ledger state snapshots might get a CDDL definition soon, at least the consensus team is asking it from the ledger team here: https://github.com/IntersectMBO/cardano-ledger/issues/4948
  - We briefly discussed what format of ledger state would be suitable for the test suite (JSON or CBOR), but it should not matter too much.
  - Transactions / blocks should quite naturally be CBOR encoded.
- The Haskell implementation of ledger (`cardano-ledger`) is conformance tested against the Agda model
  - According to Andre not exactly THE agda model that is also checked for correctness (is it?), but an equivalence checked derivation of the agda model that aligns better with the implementation state-wise
  - These conformance tests can be found [here](https://github.com/IntersectMBO/cardano-ledger/blob/master/libs/cardano-ledger-conformance/test/Test/Cardano/Ledger/Conformance/Spec/Conway.hs#L35)
- Matthias mentions that there were quite a few uncaught bugs for Conway (used to be better?)
  - While its nice to have generated test scenarios and that conformance test suite, we should not rely _only_ on it
- There are also hand-crafted test cases in the `cardano-ledger` implementation
  - For example for [these](https://github.com/IntersectMBO/cardano-ledger/blob/master/eras/conway/impl/testlib/Test/Cardano/Ledger/Conway/Imp.hs#L93)
  - Especially tests for the top-level `BBODY` or `LEDGERS` (also `UTXOS` or `UTXOW`) rules are interesting as they operate on a block or transaction level (the so-called "signal" to the rule is a block or transaction)
- Where to start?
  - Test vectors have proven to be useful in the past: for [plutus](https://github.com/IntersectMBO/plutus/tree/master/plutus-conformance) and [aiken](https://github.com/aiken-lang/aiken/tree/main/examples/acceptance_tests/script_context/v3)
  - Needs to be usable by multiple implementations / languages - not require to integrate with Haskell to _use_
  - Instead of creating a tool right away, try to assemble a few good test vectors that can directly be used by `amaru` and other implementations
  - We suspect the hand-written test scenarios ([example](https://github.com/IntersectMBO/cardano-ledger/blob/master/eras/alonzo/impl/testlib/Test/Cardano/Ledger/Alonzo/Imp/UtxowSpec/Valid.hs#L131)) provide a "better signal to noise ratio" than the [conformance test suite generators](https://github.com/IntersectMBO/cardano-ledger/blob/master/libs/cardano-ledger-conformance/src/Test/Cardano/Ledger/Conformance/ExecSpecRule/Core.hs#L424-L443)
  - We should piggy-back on the `cardano-ledger` test scenarios and dump test vectors when running them (e.g. in a patched version on a fork)
  - Test vectors should consist of
    - starting ledger state
    - one or more transactions (or blocks?)
    - expected resulting ledger state **or** expected validation error
  - Can we use one ledger state multiple times (to have less test data)?
- We also discussed whether we should depend on how validation failed
  - Exact match is likely out of scope, but maybe a common "slug" or "code" across implementations?
  - Some disagreement that there is a need to identify "failing for the right reason"

## 2025-03-20

By @ch1bo

- Started to make the logbook public with a few notes I had lying around.

## 2025-03-19

By @ch1bo

- Javier shared with me some interesting data from this article on [Node diversity on Ethereum](https://ethereum.org/en/developers/docs/nodes-and-clients/client-diversity/)
- Also <https://clientdiversity.org/> contains most recent data on distribution of implementations!

## 2025-03-10

By @ch1bo

- Looking into [cuddle](https://github.com/input-output-hk/cuddle): The huddle tutorial looks engaging, but required a few markdown fixes
- The project contains an `.envrc` to get tools set up.. but seemingly uses (a new to me) `organist` tool using `nickel` language to manage dependencies.
- Compilation currently fails with:
  ```
  src/Codec/CBOR/Cuddle/CBOR/Gen.hs:116:10: error: [GHC-18872]
      • Couldn't match type: System.Random.Internal.MutableGen f0 (M g)
                       with: CapGenM g
  ```
- Main `README` lists support for suckets/plugs - what are these?
- Socket/plug seems to be CDDL extension point: https://datatracker.ietf.org/doc/html/rfc8610#section-3.9
- There is also `generics` feature, which seems even more powerful way to parameterize cddl rules


## 2025-12-15

By @yHSJ

I've written up some basic information about the [ScriptContext](plutus/script-context.md) and provided some initial test vectors. Some important questions:
- Where should this live? `Plutus`? `Ledger`? Elsewhere?
- Do we want to provide a more robust specification of each version's `ScriptContext` and serialization to `PlutusData`? This would be massively helpful for future node implementors, but is also risky since the Haskell team intentionally has not specified this (they say it's an "implementation detail". Thus, the Haskell implementation is the source of truth and should be treated as such.
