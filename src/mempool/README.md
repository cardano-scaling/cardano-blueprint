# Mempool

> [!WARNING]
>
> This blueprint is a work in progress.
> See also [Resources](#resources)

In Cardano, for blocks to have useful data, they have to contain transactions,
which are codifications of operations on the Ledger state that only some
authorized actors can enact. Notice that such transactions are what makes up the
contents of the block. In one way, one could see the ledger as being able to
validate transactions, and by implication full blocks as those are mainly
collections of transactions.

Notice that _WHAT constitutes_ a transaction is defined by the Ledger layer and
it depends on the current era on the Ledger State that the transaction is being
validated against.

> [!TIP]
>
> The Ledger layer provides mechanisms to translate transactions from older eras
> to more recent ones. In the reference Haskell node, the translated transaction
> is the one that will be forwarded to other peers, but this is not a
> requirement.
>
> The bytes in the serialized transaction do not change by translation, however
> the tag in the tagged-sum will. See
> [the TxSubmission2 codecs](../network/node-to-node/txsubmission2#codecs).

Transactions are _pending_ on some Ledger State if they have not been included
in any block since Genesis up until such Ledger State. Transactions are _valid_
on some Ledger State if they can be applied to such Ledger State through the
Ledger rules. Notice we can create a new Ledger State by applying a single
transaction to an existing Ledger State.

Once a transaction has been included in a block, it is not a _pending
transaction_ anymore in that fork of the chain, in fact from that point onwards
it will be an _invalid transaction_, as in Cardano every transaction consumes at
least one UTxO, in this case consumed by the instance of the transaction that
was included in a block.

> [!NOTE]
>
> Notice a transaction can be invalid in a fork but valid or pending in a
> different fork.

## Purpose of the Mempool component

The Mempool serves two very different purposes:

- Provide a sequence of pending (and therefore _valid_) transactions to include
  in the next block being [forged](../consensus/forging.md).

- Serve transactions that were pending (and therefore _valid_) on top of _some
  recent_ [Chain Selection](../consensus/chainsel.md) to which we will refer as
  _mempool anchor_ (or _anchor_). Having transactions to serve means it also
  needs to validate incoming transactions.

> [!NOTE]
>
> Notice that a transaction might be considered valid in one peer, but invalid
> in another peer which uses a different anchor ledger state.
>
> Even in the case both peers have the same anchor, the existence in the mempool
> (or lack thereof) of some other specific transaction that creates (or
> consumes) the inputs for this one could lead to different verdicts on each
> peer. (This would not be the case if we validate transactions independently,
> but that was discarded)

While only nodes that forge new blocks will use these transactions to create
blocks, non-block-producing nodes are still expected to diffuse transactions to
their peers. **All participating nodes** must be able to receive, validate, and
distribute transactions.

> [!TIP]
>
> When a node is shut down, the implementation can choose what to do with the
> pending transactions. The reference Haskell implementation discards them.
> However, it is conceivable for a node to store on disk the pending
> transactions from its mempool.

## Mempool size

In order to prevent overusing resources, the Ledger places a limit on the number
of pending transactions it accepts on a single block, which should be enforced
by the mempool. Once this limit is reached, requests to add new transactions
will be rejected. This _back-pressure_ mechanism is critically important in
periods of intense traffic to preserve the overall throughput of the network.

This limit is not defined as a raw number of transactions but as a cap on
various metrics, currently 4 metrics:

- transaction size in bytes
- CPU execution units
- memory execution units
- reference scripts size

## Protocol requirements and guarantees

The [`TxSubmission2`](../network/node-to-node/txsubmission2) miniprotocol is the
one used to diffuse the pending transactions through the network.

To be able to diffuse transactions through `TxSubmission2` and to fulfill the
requirements of the Consensus layer, any mempool implementation has the
following requirements:

- Acquiring a snapshot of valid transactions for a newly forged block should be
  as fast as possible, as it will delay all other steps in the diffusion of such
  a block. This is required by the Consensus layer for [forging
  blocks](../consensus/forging.md) promptly.
- Cursor-like access to transactions which are pending (and therefore valid)
  with regards to a _mempool anchor_. This is required by the `TxSubmission2`
  protocol as it uses a ticketing counter to index transmitted transactions. If
  transaction X depends on transaction Y, then Y _must_ have a lower ticket
  counter than X (i.e. Y must come before X in the transmitted sequence). See
  [below](#dag-based-mempool) for a discussion on this.
- Eventual re-validation on a new selected chain: it is useless to keep
  transactions that are no longer valid in the mempool but a node does not need
  to eagerly evict transactions. This is an inherent requirement of the mempool
  itself.

In particular, there are two important facts that derive from these requirements:

- The transactions served by a peer were _valid_ (and therefore _pending_) in
  some recent Ledger State the peer synced their mempool with. They might _not_
  be valid on the local node's Ledger State or even on the current selected tip
  of the peer.

- The node can ingest transactions (and then serve them) as long as they are
  _valid_ (and therefore _pending_) in some recent Ledger State, which means the
  node does not _need_ to ensure a transaction is valid on the current selected
  tip.

## Fairness

> [!WARNING]
>
> TODO: describe fairness and what should mempools do in this regard.

## Improvements

The reference Haskell node does _not_ do these optimizations but they were
discussed hence we record them for the future:

### DAG-based mempool

We require that:

> if transaction X depends on Y, then Y must have a lower ticket counter than
> transaction X.

The reference Haskell node achieves this by storing the transactions in the
mempool as a sequence that is always applied in order. As it doesn't analyze
dependency among transactions, when a transaction is invalidated, it needs to
re-validate the transactions that come after it in the sequence, as they might
now become invalid too.

Amaru team suggested that a DAG-based mempool would allow the mempool to right
away discard a branch of the DAG without having to revalidate unrelated
transactions.

## Resources

- [Technical report: Cardano Consensus and Storage Layer](https://ouroboros-consensus.cardano.intersectmbo.org/pdfs/report.pdf): Documentation of the Haskell implementation of consensus components
