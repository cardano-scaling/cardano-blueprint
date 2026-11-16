# Chain validity

A chain of blocks has to be valid in order to be considered for adoption. In
particular the mainnet chain _is_ valid.

Validity is defined by induction on the length of the chain as:

- The first block on the chain fragment is valid,
- The tail of the chain fragment is valid.

For a block to be considered valid it has to be valid in three directions:

- The [envelope](#the-envelope-of-a-header) of the header must be valid,
  validity in this dimension is a Consensus responsibility.
- The header must be valid, validity in this dimension is defined by the
  [Consensus Protocol](./#the-consensus-protocol-in-cardano) in effect.
- The body must be valid, validity in this dimension is defined by the [Ledger
  era](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0059/feature-table.md)
  in effect. This check belongs to the Ledger layer so we will omit its details
  in the rest of the document.

From the description below, we omit the Ouroboros Classic case as such protocol
has been effectively retired once (P)BFT were implemented. On the original
implementation of Ouroboros Classic, the concept of Epoch Boundary Blocks (EBBs)
was introduced, blocks which were made redundant by Ouroboros BFT. Such blocks
had the peculiarity of sharing the slot number with the parent block and the
block number with the subsequent block.

> [!WARNING]
>
> TODO: this whole page could probably benefit of formal specs.

<!-- toc -->

## The Envelope of a header

The Envelope of a header consists of the ledger-independent data of a block,
such as block number, slot, hash, shape of the block, size, ... These checks are
independent of the actual Consensus Protocol in effect and are used as a first
sanity check on received blocks.

An envelope is valid if:

- The block number is greater or equal (if the previous one was an EBB) to the
  previous one,
- The slot number is greater or equal (if it is an EBB) to the previous one,
- The hash of the previous block is the expected one,
- If the block is a known checkpoint, check that it matches the information of
  such known checkpoint,
- The era of the header matches the era of the body,
- In Byron, the block is not an EBB when none was expected,
- In Shelley:
  - The protocol version in the block is not greater than the maximum version
    understood by the node (note that this check depends on each node's version,
    so this check might pass in up-to-date nodes and fail in out-of-date nodes
    for the same block).
  - The header is no larger than the maximum header size allowed by the protocol
    parameters,
  - The body is no larger than the maximum body size allowed by the protocol
    parameters.

## Ouroboros BFT

In Ouroboros BFT, a block is a tuple $B_i = (h, d, sl, \sigma_{sl},
\sigma_{\text{block}})$ where

- $h$ is the hash of the previous block,
- $d$ is a set of transactions,
- $sl$ is a (slot) time-stamp,
- $\sigma_{sl}$ is a signature of the slot number, and
- $\sigma_{\text{block}}$ is a signature of the entire block.

We can reorganize the contents of a block in _header_ and _body_ following the
[Header|body split](./#headerbody-split). The _body_ would contain
the list of transactions $d$, and the _header_ would contain all the rest of the
data.

A block is said to be _valid_ if:

- The header is valid:
  - Signatures are correct, both for the slot and for the entire block,
    - The issuer of the block was delegated in the Genesis block,
    - The issuer has not signed more than the allowed number of blocks recently
      (TODO: where does this come from? the signature scheme? It doesn't seem to
      appear in the paper)
  - The slot of the block is greater than the last signed slot in the chain,
  - $h$ is indeed the hash of the previous block,
- The body, $d$, is a valid sequence of transactions to be applied on top of the
  Ledger State resulted from applying all previous blocks since the Genesis
  block. Notice the validity of these transactions is defined in the Ledger
  layer.

See Figure 1 in the [paper][bft].

## Ouroboros PBFT

Ouroboros PBFT has two separate rules for validity of blocks, depending on
whether they are Epoch Boundary Blocks or Regular Blocks:

- An Epoch Boundary Block is _valid_ if its header is valid.

- A Regular Block is _valid_ if it is valid for Ouroboros BFT.

## Ouroboros Praos

TODO

The `body_signature` of a header is a KES signature by the block producer's hot
key. It is verified over a re-serialisation of the decoded `header_body`, not
over the bytes as received, so any encoding of the same `header_body` carries a
valid signature.

<div class="leios">

From Dijkstra on, `body_signature` is verified over the `header_body` bytes as
received. Together with the [changed header
hash](../ledger/concepts/blocks.md#changed-dijkstra-header-hash), this makes the
header hash identify exactly what the block producer signed.

</div>

## Ouroboros TPraos

TODO

## Skipping the validation checks on trusted data

Blocks can be applied much more quickly if they are known to have been
previously validated, as the outcome will be exact same, since they can only
validly extend a single chain.

This can be leveraged to skip such checks when replaying a chain that has
already been validated, for example when restarting a node and having to replay
the chain from scratch.

[bft]: https://iohk.io/en/research/library/papers/ouroboros-bft-a-simple-byzantine-fault-tolerant-consensus-protocol/
