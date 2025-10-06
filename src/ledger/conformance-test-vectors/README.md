# Conformance Tests

Here, several node developers have collaborated ot try to produce a
comprehensive set of conformance tests for the ledger.

vectors.tar.gz contains a suite of test vectors organized by various helpful
groupings. Each one is a CBOR encoded test vector file with the following
fields:

```rs
struct TestVector{
  // the initial ledger state of the test
  initial_state: LedgerState,
  // the final ledger state after applying each transition
  final_state: LedgerState,
  // A series of transactions, and the slot at which to apply them, and whether
  // the transaction should be accepted or rejected
  transitions: Vec<(transaction, slot, bool)>,
  // Some human readable metadata about the test
  metadata: AnyCbor,
}
```

The test suite is not yet comprehensive, but serves as a solid basis for
ensuring conformance to ledger era 10 validation rules.

In order to successfully pass the test suite, you should:

- Load and parse each test
- Initialize your ledger state using the data in `initial_state`
- Apply each transition, be it a transaction or advancing time; fail if the
  acceptance of a transaction doesn't match the test case
- Assert that your final ledger state matches `final_state`

## Test Vector Crate

We also provide a simple rust crate for consuming these test vectors, so that
as the format evolves, Amaru and Acropolis can update easily as well.

Currently this crate isn't published anywhere, so you'll need to depend on it
via git, or by adding this repository as a submodule to your project.

In the future, we hope much of the logic for the ledger states in particular
lives in another repo, such as pallas, and this only provides a thin wrapper
for the cbor structure of the Test Vector itself.

You can also enable the `embedded` feature, which will embed the test vectors
in the crate itself, to avoid having to read them from disk.

## Future Plans

Over time, we plan to continue to continue to extend this test suite in the
following ways:

- Broaden the coverage as the node team adds more tests
- Expand the test suite to cover past eras
- Construct additional interesting test cases by hand, as we encounter
  interesting corner cases not covered by the tests
- Update the format of the CBOR to use the canonical ledger format being
  [designed by Tweag](https://github.com/cardano-foundation/CIPs/pull/1083)
- Provide deserialization libraries in other languages

## How these were constructed

vectors.tar.gz contains test vectors initially dumped from the cardano-ledger
conway-era test suite.

The test vectors were initially obtained by running [this](https://github.com/SundaeSwap-finance/cardano-ledger-conformance-tests/commit/34365e427e6507442fd8079ddece9f4a565bf1b9)
fork of cardano-ledger:

```
git clone git@github.com:SundaeSwap-finance/cardano-ledger-conformance-tests.git
cd cardano-ledger-conformance-tests
git checkout 34365e427e6507442fd8079ddece9f4a565bf1b9
cabal test cardano-ledger-conway
tar czf vectors.tar.gz eras/conway/impl/dump/*
```

After that, we performed some hand curation:

- Ledger V9 tests were removed, since Amaru is currently only focused on Ledger
  v10
- Two tests (BodyRefScriptsSizeTooBig, TxRefScriptsSizeTooBig) produced very
  large sequences of transactions without a correspondingly significant impact
  on coverage.
- Several tests which were guarded to be no-ops in Ledger v10 were removed.

To optimize the size of the vector set, the ledger state format is modified to
represent protocol parameters records by their hash. Each unique protocol
parameters record can be found in the pparams-by-hash directory.

See also:
[this](https://github.com/IntersectMBO/cardano-ledger/issues/4892#issuecomment-2880444621)
discussion in the cardano-ledger repository.
