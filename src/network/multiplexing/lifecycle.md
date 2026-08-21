# Protocol lifecycle

The [multiplexer](./README.md) offers named, ordered byte streams: one per
pair of mini-protocol ID and mode bit `M`. It does not decide which
mini-protocols exist on a connection, when they start, or when they stop.

The node does. A node that speaks node-to-node versions 14 and 15 runs a
fixed *bundle* of mini-protocols on each bearer and uses the mux to carry
them. The rest of this page is that node-level contract.

## The node-to-node bundle

For versions 14 and 15 the bundle is:

| Mini-protocol                                 | ID  | Always present          |
| :-------------------------------------------- | --: | :---------------------- |
| [Handshake](../node-to-node/handshake)        |   0 | Yes                     |
| [ChainSync](../node-to-node/chainsync)        |   2 | Yes                     |
| [BlockFetch](../node-to-node/blockfetch)      |   3 | Yes                     |
| [TxSubmission2](../node-to-node/txsubmission2) |   4 | Yes                     |
| [KeepAlive](../node-to-node/keep-alive)       |   8 | Yes                     |
| [PeerSharing](../node-to-node/peer-sharing)   |  10 | If both sides enable it |

Version 15 does not add or remove mini-protocols relative to 14. The
difference is a capability marker for SRV records, recorded in Handshake
version data.

Handshake is a mini-protocol on the mux, like the others. The *bearer
initiator* — the side that opened the connection — starts it, and is the
Handshake mini-protocol initiator. That happens first because every other
protocol needs the negotiated version and version data. The same side can
start Handshake again on that bearer at any time.

Some implementations send the first Handshake by writing mux SDUs
themselves, before their mux task is fully started. That is a codebase
choice. The protocol is: Handshake messages travel in mux segments with
protocol ID 0.

## Dual instances and diffusion mode

Each protocol ID can carry two independent instances, distinguished by `M`
(see [The mode bit](./README.md#the-mode-bit)).

Handshake version data includes a diffusion mode. Negotiation takes
initiator-only if either side asks for it:

- *Duplex*: the node runs initiator and responder of each protocol in the
  bundle.
- *Initiator-only*: the node that initiated the bearer runs only initiator
  instances of those protocols.

On a duplex bearer a node is therefore typically both client and server of the
same peer.

## Starting

The bearer initiator starts Handshake as soon as the bearer is up. The
other side must answer it, and must answer a later Handshake on the same
bearer.

For every mini-protocol, the responder must be ready to handle any legal
request at any time, including after a clean `MsgDone` when the initiator
starts the protocol again. A restarted responder is in its initial state
and sends nothing — the initiator has agency.

Which initiator instances a node starts, and when, is a local choice
(except Handshake, which the bearer initiator always starts).

> [!NOTE]
>
> How a node keeps responders ready is an implementation detail. The
> Haskell node starts most responders when the first SDU for that protocol
> ID arrives, and starts the KeepAlive responder on the first ingress of
> any mini-protocol. The wire contract is only that a legal request is
> handled, including a restart.

## Agency, `MsgDone`, and restart

In every mini-protocol exactly one side has agency, except in the terminal
state `StDone`, which has nobody’s agency: after `MsgDone` neither side may
send. An unexpected message in `StDone` is a protocol error and tears the
bearer down.

A clean `MsgDone` is not a connection close. The mux stream for that
protocol ID and `M` stays usable. The initiator may start a fresh instance
of the same mini-protocol on that stream. The responder must be ready, as
above.

## Activity and bearer use

An initiator instance is *active* from the first message it sends until
`MsgDone` (or until the bearer dies). While it is active, the matching
responder is *serving* it. The peer has that protocol *active towards us*
when we are serving its initiator — it opened that instance and has
not yet sent `MsgDone`.

From one node's point of view a bearer is in one of these uses (Serving
and Using can hold together on a duplex bearer):

| Term | Meaning |
| :--- | :------ |
| Negotiating | Handshake is in progress |
| Idle | Handshake done; no protocol is active either way; bearer will be closed after 5 seconds |
| Serving | At least one protocol is active towards us |
| Using | At least one of our initiators is active |
| Stopping a group | We have asked our initiators in a group to send `MsgDone`; not all of them have reached `StDone` yet |
| Closed | The bearer is torn down |

Idle is not the same as "responders are waiting." A responder that has
seen no request yet is not serving; the peer is not active towards us
until it sends.

## Groups that start and stop together

The post-handshake protocols on one bearer are one unit of *failure*: if
any of them misbehaves or the mux itself fails, the node tears the bearer
down. They are not one unit of *lifetime*. A node can stop some of them
and leave the bearer up.

Two groups are the useful split for versions 14 and 15:

- **Diffusion**: `ChainSync`, `BlockFetch`, `TxSubmission2` — following or
  serving the chain and mempool.
- **Maintenance**: `KeepAlive`, and `PeerSharing` if negotiated — keep the
  bearer measured and optionally share peers, without diffusion.

A node that is Using a peer as an upstream typically has diffusion (and
maintenance) active. It can stop diffusion and stay on maintenance only.

Starting one protocol in a group does not, on the wire, start the others.
`ChainSync` without `BlockFetch` to the same peer is legal: headers can
come from one peer and bodies from another. The Haskell node, when it
promotes a peer to diffusion, starts all three diffusion *initiators* at
once (`StartEagerly`), even if `BlockFetch` then sits in `StIdle` and
never sends `MsgRequestRange`.

### Stopping a group

Only the initiator can end an instance cleanly, and only when it has
agency: it sends `MsgDone`. The responder follows to `StDone`. We cannot
force the peer to end *its* initiators (activity towards us) except by
tearing the bearer down.

To stop a group without closing the bearer:

1. Each of our active initiators in that group sends `MsgDone` at the next
   moment it has agency.
2. Wait until every instance in the group is in `StDone` (last to finish).
3. If that wait exceeds a bound, tear the bearer down. Otherwise the mux
   is left with in-flight data on a protocol that should have stopped.

Last-to-finish applies to instances this node *started*, not to every
name in the group. A `BlockFetch` initiator that was never started does
not need a `MsgClientDone`. One that was started but never sent
`MsgRequestRange` still does: it is sitting in `StIdle` with agency, and
`MsgClientDone` is how it leaves.

If one started protocol in the group reaches `StDone` and the others do
not follow within the bound, that is a failed stop: close the bearer. A
node that intends to keep the bearer must finish the whole started group.

The bound has to be long enough that an initiator can regain agency. On
`ChainSync` the responder can hold agency in `StMustReply` for several
minutes.

Other groups on the same bearer stay up. Stopping diffusion does not stop
maintenance.

> [!NOTE]
>
> The Haskell node waits up to 300 seconds for the diffusion group to
> stop, and up to 120 seconds when stopping maintenance as well. After
> every protocol that was active towards us has `MsgDone`, if we are not
> Using the bearer, it closes after 5 seconds idle.

## Tear-down

The node tears the bearer down — and therefore every mini-protocol on it —
when any of the following happens:

- A mini-protocol receives a message that is invalid in its current state
- An SDU arrives with an unknown mini-protocol ID
- A mini-protocol’s ingress buffer would overflow
- A mux SDU timeout or a mini-protocol per-state time or size limit is
  exceeded
- A `KeepAlive` response cookie does not match the cookie that was sent

Protocol errors skip any idle grace period: the connection is reset at
once.

If the bearer is Idle — nothing active towards us, and we are not Using
it — the node closes it after a short idle interval (5 seconds in the
network specification). After a reset, the connection manager commonly
waits 60 seconds before the same address can be reused (a TCP
`TIME_WAIT` analogue). Whether the node then retries, forgets, or
classifies the peer is [Peer management](../peer-management.md).
