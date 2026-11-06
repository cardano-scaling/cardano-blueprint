---
leios: new
---

# Relaying Leios announcements and votes

Leios adds two kinds of information that every node must pass on to its peers
promptly: **announcements** of endorser blocks (EBs), and **votes** for them.
Both travel in [LeiosNotify](../network/node-to-node/leios-notify/README.md),
which each node runs with each of its peers, so that whatever reaches one honest
node reaches all of them. This page specifies which announcements and votes a
node relays, and for how long. The rules a node holds its upstream peers to are
on the LeiosNotify page; this page is about what a node sends, which must never
break them.

<!-- toc -->

## Timeline of an election

A ranking block (RB) announces an EB in its header. Each block producer elected
in a slot holds an **election**, identified by the slot and the pool, and an
honest one announces one EB in it. Let $t_0$ be the wall-clock onset of the
slot. With the protocol parameters $L_\text{hdr}$, $L_\text{vote}$ and
$L_\text{diff}$:

| From                                   | Until                                                  | What happens                                         |
| :------------------------------------- | :----------------------------------------------------- | :--------------------------------------------------- |
| $t_0$                                  | $t_0 + 3 L_\text{hdr}$                                 | Announcements diffuse, and so do any equivocations.  |
| $t_0 + 3 L_\text{hdr}$                 | $t_0 + 3 L_\text{hdr} + L_\text{vote}$                 | Committee members vote, and the votes diffuse.       |
| $t_0 + 3 L_\text{hdr} + L_\text{vote}$ | $t_0 + 3 L_\text{hdr} + L_\text{vote} + L_\text{diff}$ | Nobody votes any more, but the votes keep diffusing. |

The end of the last period,
$t_0 + 3 L_\text{hdr} + L_\text{vote} + L_\text{diff}$, is the **deadline** of
the election's votes.

A node relays an announcement before any vote or offer for it, to every peer.
A peer can then tell a vote or offer for an announcement it never received,
which no honest node sends, from one it merely has not received yet.

## Relaying announcements

An announcement is the header of the RB. It diffuses through LeiosNotify
independently of ChainSync and of chain selection: a node relays an
announcement whether or not it adopts the RB, as it may never adopt it, while
the votes depend on everyone learning about it within $3 L_\text{hdr}$.

A node relays an announcement, from whichever peer or of whichever block it
forged, if

- the header is valid out of the context of a chain: its election proof, its
  KES signature and its size. Whether its operational certificate counter is
  at most one more than the last one is left out, as only a chain can tell;
- it is not signed under an operational certificate that the ledger state at
  the node's immutable tip shows was superseded;
- it is the first or the second announcement of its election that the node
  has. A second one is an equivocation, which voters must learn of, so that
  they do not vote in that election. A node never relays a third announcement
  of an election, nor one announcement twice;
- its slot has begun by the node's own clock, and began at most 5 minutes ago.

A node sends a downstream peer the two announcements of an election in the
order it relayed them, so the peer never receives an equivocation without the
announcement it equivocates.

A node may receive an announcement from the near future, from a peer whose
clock is ahead, and accept it if it is early by no more than the clock skew it
tolerates. It relays it only once its slot has begun by its own clock, as
ChainSync does for a header from the near future, since a downstream peer whose
clock is behind would otherwise judge it too early.

## Relaying votes

A Leios vote is only ever used for one thing: together with enough other votes
for the same announcement, it forms the
[certificate](leios-committee.md#leios-certificates) that the next RB may
include. Each node relays the votes it receives, so that each vote reaches the
next block producer, whoever that is.

A node relays a vote, from whichever peer or of its own, if

- it has relayed the announcement the vote is for, that is the RB header whose
  hash the vote signs;
- it is the first valid vote of its seat in that slot that the node has. An
  honest seat votes at most once per slot, as at most one announcement of a
  slot can be at the tip of its selection. A seat that votes twice, for
  instance for both announcements of an equivocating election, gets only its
  first vote relayed;
- its seat holds a key in the election's [committee](leios-committee.md), and
  its signature verifies under that key. A node does not relay a vote it has
  not verified, so a peer that sends an invalid vote is dishonest;
- its voting period has begun by the node's own clock, and the node has the
  vote, verified, by its deadline.

As a vote is only worth relaying as its seat's first, a node need only verify a
vote of a seat it has no vote of yet. Verifying a BLS signature is by far the
most expensive step, so copies of a known vote, which a node receives from each
of its upstream peers, cost it only their bytes.

Votes that arrive early, within the clock skew the node tolerates, are held
until their voting period begins, as announcements are, so a peer whose clock
is ahead holds up its own votes no more than its own announcements.

### Why votes stop at their deadline

The earliest RB that can include a certificate is the first one at or after
the deadline, and the protocol parameters must leave enough time for votes to
diffuse and be aggregated by then. A vote that arrives later shows they did not.

Such a vote could still complete a certificate for an RB that happens to be
issued later, and so certify an EB that otherwise would not be. But the
security of Leios relies on a certified EB having diffused by the end of
$L_\text{diff}$, and a quorum that is late is no evidence of that. So a node
deliberately gives up that throughput rather than endanger safety: it neither
relays nor counts towards a certificate a vote it has only after its deadline.

So an announcement reaches its quorum by the deadline or never, and a node can
forget the votes of an election at its deadline. It never needs more than one
vote per committee seat for each of the few elections whose votes are still
diffusing. A block producer that aggregates a certificate by the deadline keeps
it until the announcing RB is immutable, as the RB that includes the
certificate may well be issued after the deadline.

## Related specifications

- [LeiosNotify](../network/node-to-node/leios-notify/README.md) — the messages
  that carry announcements and votes, and the rules a node holds its upstream
  peers to.
- [Leios key registration and committee selection](leios-committee.md) — the
  committee that votes, what a vote signs, and the certificate votes form.
