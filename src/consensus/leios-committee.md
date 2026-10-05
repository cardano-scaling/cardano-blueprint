---
leios: new
---

# Leios key registration and committee selection

Leios endorses transaction availability out-of-band from the Praos block chain
via [Endorser Blocks](../network/node-to-node/leios-notify/README.md) (EBs). An
EB becomes part of the canonical history only once a **Leios certificate**
attests that a stake-weighted **voting committee** has seen it. This page
specifies how stake pools register the BLS keys used for that voting, how the
committee is derived from the stake distribution, and how a certificate is
constructed and validated.

Committee derivation is **deterministic**: from a given stake distribution every
node must arrive at the same committee, because a node that derives a different
committee would reject certificates that were validly produced under the intended
one. This page specifies that derivation and the certificate format independently
of any particular implementation, so that all nodes agree.

<!-- toc -->

## Registering a voting key

A stake pool advertises the BLS key it will vote with by including an optional
`bls_key` in its stake-pool registration certificate (a ledger, Dijkstra-era
structure — see [`dijkstra.cddl`](../ledger/eras/dijkstra.cddl)):

```cddl
{{#include ../ledger/eras/dijkstra.cddl:465:482}}
```

- The key pair is **BLS12-381** in the *minimal-signature-size* configuration:
  verification keys live in G2 (96 bytes), signatures in G1 (48 bytes).
- `bls_possession_proof` is a **proof of possession** (PoP): a signature over
  the verification key under a fixed, Leios-specific domain-separation tag
  (DST). It proves the registrant holds the corresponding secret key and defends
  the aggregate signature scheme against rogue-key attacks. Implementations
  **must** verify the PoP with the same DST that certificate verification uses
  (see below); a key whose PoP does not verify is rejected at registration and
  the pool is treated as having no key.
- The field is optional, so existing (pre-Leios) registrations remain valid. A
  re-registration replaces the pool's `bls_key` like any other pool parameter,
  taking effect at the next epoch boundary via the usual stake-snapshot pipeline.
- Because it is a pool parameter, the key travels with the pool through the stake
  distribution snapshots: the per-pool entry of the active stake distribution
  carries the pool's `bls_key` alongside its relative stake. That distribution
  is the sole input to committee selection.

To actually cast votes, the node operating the pool must hold the corresponding
**BLS signing key**; a node that only knows the on-chain (public) registration
validates certificates but does not vote.

### Expiry and rotation

A registered voting key is honoured for a bounded number of epochs after its
registration. A pool that has not re-registered by then keeps its seat but
loses its key, so it can no longer sign. Expiry takes effect at an epoch
boundary, like activation, so the set of usable keys is stable throughout an
epoch.

The bound is **not a protocol parameter**. It is derived from the KES setup
already fixed in genesis:

```
maxKeyAgeEpochs = ceil(slotsPerKESPeriod * maxKESEvolutions / epochLength) + 2
```

that is, the KES key lifetime rounded up to whole epochs plus the two epochs of
activation delay. On mainnet this evaluates to **21 epochs**. Deriving the bound
rather than governing it keeps voting-key rotation on the same schedule as the
KES rotation pools must perform anyway, with no second knob that could drift out
of step.

Expiry is judged against the epoch the committee is selected *for*, not the
epoch its stake snapshot was taken in: a seat's key arrives through a snapshot
and may have been registered several epochs earlier, while the age bound is
applied afresh at each epoch boundary.

## Selecting the voting committee

For each epoch the voting committee is derived **deterministically** from the
active stake distribution — the same snapshot used for Praos leader election — so
that all honest nodes agree on it without any coordination.

The committee is an ordered list of **seats**. It consists of the top $N_c$
pools by active stake, where $N_c$ is the `leios committee size` protocol
parameter (key 43 of `protocol_param_update`). Pools are ordered by active
stake descending, ties broken by pool ID ascending (byte-wise on the pool's key
hash); the first $N_c$ are seated, or all of them if fewer than $N_c$ pools are
registered. A pool's position in that order is its **seat index**, counted from
`0`, and that index is what a vote and a certificate refer to.

A seat is:

- **keyed** if its pool has a `bls_key` that is both valid (PoP verified) and
  unexpired — it can sign, and its `bls_pubkey` is the seat's verification key;
  or
- **keyless** otherwise — the seat exists and still carries its pool's stake
  weight, but can never contribute a valid signature.

Committee membership is thus by stake alone, independent of key registration.

> [!IMPORTANT]
>
> Committee derivation is **consensus-critical**: every node on a network must
> use the identical $N_c$ and the identical selection procedure. Two nodes that
> derive committees differing in seat membership, ordering, or keyed/keyless
> status will disagree on which certificates are valid and fork.

$N_c$ is a **liveness** parameter rather than a safety-critical one. Because each
seat carries its own pool's stake and the quorum is a predicate on stake (see
below), a seat count cannot mis-weight or under-represent any pool; it only
decides how much active stake is *eligible* to vote. Setting it too low means the
seated pools together hold less stake than the quorum demands, and then no
certificate can be formed even with unanimous support. The share of active stake
held by the top $N_c$ pools drifts as stake moves, so $N_c$ must be governed to
keep that share above the quorum threshold with headroom for members that are
offline, keyless, or too slow to vote.

## Leios certificates

A [block body](../ledger/eras/dijkstra.cddl) may carry a `leios_certificate`
attesting the EB announced by (a recent) block header. The certificate records
*which* committee seats voted and an aggregate of their signatures:

```cddl
{{#include ../ledger/eras/dijkstra.cddl:921:926}}
```

- `signers` is a **bitfield** over seat indices: bit `i` set means the committee
  seat with index `i` contributed a vote. (For example `0xa0` = `1010_0000`
  marks seats 0 and 2.) It is `⌈N/8⌉` bytes, where `N` is the committee size for
  the epoch in which the announcing RB was produced.
- Each voter signs the same certified message — the hash of the RB header that
  announced the EB — with its registered BLS key. `signature` is the BLS
  aggregate of exactly the signatures of the seats marked in `signers`.

The certificate repeats neither the announcing RB's slot nor the EB hash: the
announcing RB is determined from the certifying RB's own chain context, so both
would be redundant on the wire.

### Constructing a certificate

A block producer that has collected votes for an announced EB aggregates the
signatures of the voting seats and sets the corresponding bits in `signers`. A
certificate is only worth including once the marked seats' **combined stake
meets the quorum threshold** $\tau$ — the `leios quorum stake threshold`
protocol parameter (key 44), expressed as a fraction of *total active stake*,
not of the stake seated on the committee.

### Verifying a certificate

To validate a block carrying a `leios_certificate`, a node MUST:

1. Reconstruct the committee for the certificate's epoch from its own copy of the
   active stake distribution, using the exact selection procedure above.
1. Resolve every seat index set in `signers` to that seat's `bls_pubkey`. If
   any set bit resolves to a **keyless** seat, the certificate is invalid — it
   claims a vote from a seat that carries no usable key.
1. Verify `signature` as a BLS aggregate of the resolved public keys over the
   hash of the announcing RB header, under the Leios DST.
1. Check that the stake covered by the signing seats meets $\tau$ times the
   total active stake.

A block whose certificate fails any of these checks is invalid. Steps 1 and 2
together are why committee derivation must be deterministic and shared: a node
whose committee diverges from the one the votes were cast under — through a
different $N_c$, a different selection or seat ordering, or a differing view of
which keys are usable — rejects legitimately signed certificates and cannot
follow the chain.

## Related specifications

- [LeiosNotify](../network/node-to-node/leios-notify/README.md) and
  [LeiosFetch](../network/node-to-node/leios-fetch/README.md) — how EBs and their
  bodies are announced and fetched between peers, and the `vote` structure whose
  `voter_id` is the seat index used here.
- [Dijkstra era CDDL](../ledger/eras/dijkstra.cddl) — `bls_key`, `pool_params`,
  `eb_announcement`, `leios_certificate` and the block header's
  `block_body_contains_leios_cert` / `eb_announcement` fields.
- [Leios (CIP-0164)](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0164)
  — the protocol design and the rationale for stake-based committee selection.
