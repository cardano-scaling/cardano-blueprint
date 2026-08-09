# Leios key registration and committee selection

> [!WARNING]
>
> This is **proposed** and not yet part of the Cardano mainnet. It is specified
> as part of [Leios (CIP-0164)](https://github.com/cardano-foundation/CIPs/pull/1167),
> an extension to the Ouroboros consensus protocol aimed at significantly
> increasing transaction throughput. Details are subject to change.

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

## Registering a Leios key

A stake pool advertises the BLS key it will vote with by including an optional
`leios_key` in its stake-pool registration certificate (a ledger, Dijkstra-era
structure — see [`dijkstra.cddl`](../ledger/eras/dijkstra.cddl)):

```cddl
pool_params =
  ( operator       : pool_keyhash
  , vrf_keyhash    : vrf_keyhash
  , ? leios_key    : leios_key/ nil   ; optional; pools without it cannot vote
  , ...
  )

leios_key =
  [ leios_pubkey          : bytes .size 96   ; BLS12-381 verification key (G2, minimal-signature-size)
  , leios_possessionproof : bytes .size 48   ; proof of possession (G1 signature)
  ]
```

- The key pair is **BLS12-381** in the *minimal-signature-size* configuration:
  verification keys live in G2 (96 bytes), signatures in G1 (48 bytes).
- `leios_possessionproof` is a **proof of possession** (PoP): a signature over
  the verification key under a fixed, Leios-specific domain-separation tag
  (DST). It proves the registrant holds the corresponding secret key and defends
  the aggregate signature scheme against rogue-key attacks. Implementations
  **must** verify the PoP with the same DST that certificate verification uses
  (see below); a key whose PoP does not verify is treated as absent.
- The field is optional, so existing (pre-Leios) registrations remain valid. A
  re-registration replaces the pool's `leios_key` like any other pool parameter,
  taking effect at the next epoch boundary via the usual stake-snapshot pipeline.
- Because it is a pool parameter, the key travels with the pool through the stake
  distribution snapshots: the per-pool entry of the active stake distribution
  carries the pool's `leios_key` alongside its relative stake. That distribution
  is the sole input to committee selection.

To actually cast votes, the node operating the pool must hold the corresponding
**BLS signing key**; a node that only knows the on-chain (public) registration
validates certificates but does not vote.

## Selecting the voting committee

For each epoch the voting committee is derived **deterministically** from the
active stake distribution — the same snapshot used for Praos leader election — so
that all honest nodes agree on it without any coordination.

The committee is an ordered list of **seats**. Seats are allocated to pools by
relative stake so that the seated pools together cover a target fraction of the
total stake — the **P99** committee-stake-coverage target that
[CIP-0164](https://github.com/cardano-foundation/CIPs/pull/1167) found feasible
(chosen so an honest majority of committee stake holds with overwhelming
probability). A seat is:

- **keyed** if its pool registered a `leios_key` (with a valid PoP) — it can
  sign, and its `leios_pubkey` is the seat's verification key; or
- **keyless** if the pool has no usable `leios_key` — the seat exists (it still
  carries stake weight) but can never contribute a valid signature.

> [!IMPORTANT]
>
> The P99 coverage target is currently **hard-coded**, not a protocol parameter.
> It is therefore **consensus-critical**: every node on a network must use the
> identical value and the identical selection procedure. Two nodes that derive
> committees differing in seat membership, ordering, or keyed/keyless status will
> disagree on which certificates are valid and fork. Changing the target requires
> a coordinated update of every node until it is promoted to a governed
> protocol parameter.

Seats are indexed from `0` in the committee's canonical order; that index is what
a certificate refers to.

## Leios certificates

A [block body](../ledger/eras/dijkstra.cddl) may carry a `leios_certificate`
attesting the EB announced by (a recent) block header. The certificate records
*which* committee seats voted and an aggregate of their signatures:

```cddl
leios_certificate =
  [ signers              : bytes            ; bitfield over committee seat indices
  , aggregated_signature : leios_signature
  ]

leios_signature = bytes .size 48            ; aggregate BLS12-381 signature (G1)
```

- `signers` is a **bitfield**: bit `i` set means the committee seat with index
  `i` contributed a vote. (For example `0xa0` = `1010_0000` marks seats 0 and 2.)
- Each voter signs the same certified message — the EB reference — with its
  registered BLS key. `aggregated_signature` is the BLS aggregate of exactly the
  signatures of the seats marked in `signers`.

### Constructing a certificate

A block producer that has collected votes for an announced EB aggregates the
signatures of the voting seats and sets the corresponding bits in `signers`. A
certificate is only worth including once the marked seats' **combined stake meets
the quorum threshold** implied by the committee (again derived from the same
P99-covered committee).

### Verifying a certificate

To validate a block carrying a `leios_certificate`, a node MUST:

1. Reconstruct the committee for the certificate's epoch from its own copy of the
   active stake distribution, using the exact selection procedure above.
2. Resolve every seat index set in `signers` to that seat's `leios_pubkey`. If
   any set bit resolves to a **keyless** seat, the certificate is invalid — it
   claims a vote from a seat that carries no registered key.
3. Verify `aggregated_signature` as a BLS aggregate of the resolved public keys
   over the certified EB message, under the Leios DST.
4. Check that the stake covered by the signing seats meets the committee's quorum
   threshold.

A block whose certificate fails any of these checks is invalid. Steps 1 and 2
together are why committee derivation must be deterministic and shared: a node
whose committee diverges from the one the votes were cast under — through a
different P99 value, a different selection or seat ordering, or a missing
registered key — rejects legitimately signed certificates and cannot follow the
chain.

## Related specifications

- [LeiosNotify](../network/node-to-node/leios-notify/README.md) and
  [LeiosFetch](../network/node-to-node/leios-fetch/README.md) — how EBs and their
  bodies are announced and fetched between peers.
- [Dijkstra era CDDL](../ledger/eras/dijkstra.cddl) — `leios_key`, `pool_params`,
  `leios_announcement`, `leios_certificate` and the block header's
  `leios_certified` / `leios_announcement` fields.
- [Leios (CIP-0164)](https://github.com/cardano-foundation/CIPs/pull/1167) — the
  protocol design and the rationale for the P99 committee parameter.
