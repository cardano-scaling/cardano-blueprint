# Peer management

The [multiplexer](multiplexing/README.md) and the
[mini-protocols](mini-protocols.md) are the mechanisms a node uses to
talk to a peer. This page is about the local policy that sits on top of
them: whom to dial, whom to use for diffusion, and *why* a peer leaves
that set.

Those decisions are not negotiated and are not visible as their own
mini-protocol. They are also not a single function every node must
share. What must interoperate is the wire behaviour — clean
[`MsgDone`](multiplexing/lifecycle.md#agency-msgdone-and-restart),
immediate reset on a protocol error, serving only legal messages. How
a node ranks, samples, and retries peers is a local choice.

A peer leaves the diffusion set for one of three reasons. Those three
look similar from the outside — the bearer goes away — and they are
not. A fourth case only stops using the peer as an upstream and is
covered separately.

| | Regular churn | Protocol error | Adversarial |
| :--- | :--- | :--- | :--- |
| Cause | scheduled mixing | illegal on the wire | legal wire, dishonest content |
| How it ends | clean `MsgDone`, then idle close | immediate reset | immediate reset |
| Judgment | still honest | unknown — buggy or worse | this session is hostile |
| Try again | yes, as a normal candidate | short backoff, then fail-count | at least the error backoff; may forget |

[Peer selection](../consensus/peersel.md) in the consensus chapter
covers static versus dynamic configuration, eclipse risk, and the
network-level churn rate. This page is the network-layer counterpart:
what happens to the bearer, and what the node should remember about
the peer afterwards.

## Regular churn

Churn is planned. The peer has not misbehaved. The node stops using
it for diffusion so the graph keeps mixing: new peers get a chance,
and a set that happened to be lucky at first contact does not freeze
in place.

The node ranks the peers it is currently using for diffusion and drops the
worst-performing fraction. The ranking that has been simulated at network scale
rewards the peer that first announced a correct new block; see [Peer
selection](../consensus/peersel.md). About **20% per hour** is the rate the IOG
/ Athens overlay simulations supported ([Santos 2023][p2p-eng]; the Close-Random
and header-first scoring policies are [CougaR][cougar] and
[SCRamble][scramble]). **40% per hour** anecdotally may lead to network split
(this number comes from private discussions with the IOG network working group).
The interval itself should be fuzzed so the whole network does not churn on the
same clock.

Churn uses the *clean* path in
[Protocol lifecycle](multiplexing/lifecycle.md#stopping-a-group):

1. Stop the diffusion group (`ChainSync`, `BlockFetch`,
   `TxSubmission2`) with `MsgDone`.
2. The bearer may stay up on the maintenance group, or close after
   the idle interval if nothing is active either way.
3. The peer remains known. It is eligible to be picked again.

Do not reset the bearer for churn, and do not increment a failure
count. A reset would look like a protocol error to the peer, and a
failure count would eventually forget an honest neighbour.

## Protocol errors

A protocol error is a message that is illegal *as a message*: wrong
state, unknown mux ID, size or time limit exceeded, `KeepAlive`
cookie mismatch, a `BlockFetch` range that does not match what was
asked, a `TxSubmission2` FIFO rule broken, and the other cases listed
on the mini-protocol pages and under
[Tear-down](multiplexing/lifecycle.md#tear-down).

The bearer is a unit of failure. A protocol error skips the idle
grace period and resets the connection at once. Every mini-protocol
on that bearer dies with it.

This is not yet a judgment that the peer is adversarial. The peer
may be buggy, running a different version of a rule, or malicious —
the wire does not say which. The node should:

- treat the session as finished,
- wait before dialling the same address again (long enough to absorb
  a transient fault, short enough that a flaky-but-honest peer is
  not lost),
- count consecutive failures, and forget the address after a small
  number of them (unless it is a statically configured local root).

A later successful diffusion session should clear that count. Local
roots are not forgotten this way: the operator asked for them.

## Adversarial classification

Classification is for content that is *legal on the wire* and
*dishonest as a chain*. The peer followed the state machine and
still served something it could have known was invalid.

The connection is torn down — same reset as a protocol error —
because the bearer is still a unit of failure. The difference is
what the node remembers.

Typical cases, already listed on the protocol pages:

- A cryptographically or structurally invalid header
  ([`ChainSync`](node-to-node/chainsync))
- A header for a block the node already knows is invalid
- A claimed intersection that was not among the points the
  initiator sent
- A block body that does not validate, when the matching header
  was **not** advertised as
  [tentative](node-to-node/chainsync/#chainsync-pipelining-or-pipelined-diffusion)
- A header from the far future, or a historic header offered
  while the node is not syncing

A body that fails to match its header is a `BlockFetch` contract
breach and is torn down as a protocol error. A well-formed body
that the ledger rejects, after a non-tentative header, is
classification.

Classification is **local**. There is no network-wide blacklist. A
peer that served this node an invalid block may be honest toward
someone else, or this node may have been wrong. The node should
still not treat the event as a glitch: do not immediately put the
peer back into the diffusion set on the same evidence.

Forgetting the address, or keeping it known but ineligible for a
long time, are both reasonable. What is not reasonable is to handle
an invalid block with the same "try again in a few seconds" path
used for a dropped TCP connection.

Churn ranking is the wrong tool here. A peer that sent an invalid
block may have been first to announce it. First-to-announce is a
performance signal among honest peers, not a defence.

## Uninteresting as an upstream

This case is easy to confuse with classification and is neither
churn nor hostility.

The peer’s chain forks more than `k` blocks from this node’s
selection, or no intersection can be found. The peer is not useful
as an *upstream* for headers and bodies. It has not (on that
evidence) served anything invalid. A node can stop its own
diffusion initiators — the clean group stop — and keep the bearer
for maintenance and for serving the peer. The peer may still want
*this* node’s chain, and may still be a useful transaction source.

That is a usefulness decision, not a hostility one. Retrying the
peer as an upstream after a few minutes is appropriate; forgetting
it is not required.

## Selecting new peers

When a slot opens — after churn, after a failure, or because the
known set is below target — the node picks someone new. Sources
are the ones [Peer selection](../consensus/peersel.md) already
names:

- a static topology (local roots, including a block producer’s
  relays)
- the ledger (registered stake-pool relays, including SRV names
  on version 15)
- [PeerSharing](node-to-node/peer-sharing) replies
- inbound peers the node has recently served

An inbound TCP remote is a dial target only if the peer sourced
the connection from its listen port. A Haskell duplex node does
that. Others (for example Amaru) use an ephemeral source port;
their listen address, if needed, has to come from somewhere else
— a `MsgSharePeers` that includes it, the ledger, or topology.
See [What to reply with](node-to-node/peer-sharing#what-to-reply-with).

Which of those to mix, how to sample from a `MsgSharePeers` list,
how to rank candidates for promotion, and how to break ties are
where node implementations should **healthily differ**.

This is one of the points of the node-diversity work that started
in 2024. The mini-protocols are a shared language. The selection
function is not. If every implementation scores and samples peers
the same way, that function becomes a single target: an adversary
that looks good under it is preferred by the whole network. Diverse
selection makes that attack more expensive. A second implementation
is more useful if it does not clone the first node’s governor.

What should stay common is the frame around that choice:

- Do not all churn at once (fuzz the interval).
- Stay near the 20%/h replacement rate unless the alternative has
  been simulated.
- Do not promote a peer that was just classified, or that has
  exhausted its failure count, as if it were a fresh random
  neighbour.
- Prefer peers with a recent *successful* session when asking
  `PeerSharing`; see [Sharing behaviour](node-to-node/peer-sharing#sharing-behaviour).
- Keep a static path to at least one known honest peer if the
  node cannot otherwise defend against eclipse
  ([Ouroboros Genesis](https://iohk.io/en/research/library/papers/ouroboros-genesis-composable-proof-of-stake-blockchains-with-dynamic-availability/)).

> [!NOTE]
>
> The Haskell node’s outbound governor is one design, not the
> protocol. Cold / warm / hot are its names for known-not-connected,
> bearer-up-on-maintenance, and Using for diffusion. Promotion of
> unknown peers is uniform-random among the eligible set. Demotion
> of diffusion peers is by *upstreamyness* (who first sent a new
> correct header) plus *fetchyness* (who supplied the body), over a
> sliding window of 180 slots — about one hour of mainnet blocks.
> Warm peers marked tepid are twice as likely to be demoted; cold
> peers with failures are more likely to be forgotten. Big-ledger
> peers are churned first, as their own target counters. None of
> that ranking is a wire rule.

## Recommended time constants

The figures below are the Haskell node’s current defaults. They
are a recommendation: a starting point that has run on mainnet,
not a protocol requirement. A different implementation may change
them, but should know why these values are this large — several
of them exist so a `ChainSync` responder that is sitting in
`StMustReply` can regain agency before the local side gives up.

| What | Recommended | Role |
| :--- | ----------: | :--- |
| Churn interval, caught up | 3300 s, plus up to 600 s fuzz | one cycle of the 20% replacement |
| Churn interval, bulk sync | 900 s, plus up to 60 s fuzz | same idea, faster while catching up |
| Fraction replaced per cycle | 20%, at least one | see [Peer selection](../consensus/peersel.md) |
| Stop diffusion (last-to-finish) | 300 s | clean group stop; covers `StMustReply` |
| Stop maintenance / close bearer | 120 s | last-to-finish on the maintenance group |
| Idle close | 5 s | nothing active either way |
| Address reuse after reset | 60 s | connection-manager analogue of TCP `TIME_WAIT` |
| Re-promote after a protocol error | 10 s, ±2 s fuzz | transient fault |
| Failures before forgetting | 5 | unless the peer is a local root |
| Clear failure count | 120 s of successful diffusion | the peer earned another chance |
| Re-promote after churn (`MsgDone`) | 10 s | governor may pick it again |
| Re-try as upstream after fork / no intersection | 120 s | uninteresting, not hostile |
| Re-try as upstream after rollback past intersection | 180 s | same idea, slightly colder |
| Give up establishing during churn | 60 s | churn moves on; the dial is not reset |
| `PeerSharing` activation delay | 300 s | do not ask a brand-new neighbour |
| `PeerSharing` retry | 900 s | do not map one peer too fast |

After a classified invalid block the Haskell node today takes the
same 10 s error path and the same failure count as a protocol
error. That is the weak end of the recommendation: treating
classification as a dropped connection. Implementations should at
least not *prefer* that peer, and may forget it immediately.

## Resources

- [Technical report: Data Diffusion and Network](https://ouroboros-network.cardano.intersectmbo.org/pdfs/network-design/network-design.pdf): original P2P design, including adversarial peers and eclipse
- [Ouroboros Network Specification](https://ouroboros-network.cardano.intersectmbo.org/pdfs/network-spec/network-spec.pdf): connection manager and governor as implemented in Haskell
- [Peer selection](../consensus/peersel.md): static / dynamic setup, eclipse, churn rate
- [Santos, *Engineering dive into Cardano’s Dynamic P2P design*][p2p-eng] (IOG Engineering Blog, 2023): 20%/h production churn; 20% vs 40% replacement in the overlay simulations
- [Kolyvas and Voulgaris, *CougaR*][cougar] (DEBS 2022): Close-Random overlay policy from the same Athens / IOG collaboration
- [Kolyvas, Antonov and Voulgaris, *SCRamble*][scramble] (ICDCN 2026): header-first scoring overlay; IOG-funded follow-on

[cougar]: https://doi.org/10.1145/3524860.3539805
[p2p-eng]: https://www.essentialcardano.io/article/engineering-dive-into-cardanos-dynamic-p2p-design
[scramble]: https://arxiv.org/abs/2601.10277
