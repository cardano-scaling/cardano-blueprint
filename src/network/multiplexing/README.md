# Multiplexing

The multiplexing layer is a simple binary protocol which runs on top of the
raw connection (TCP or local socket) and provides:

- Concurrent, ordered **byte streams** for
  [mini-protocols](../mini-protocols.md) [^agnostic]
- Timing information for latency measurement

It forwards bytes between a pair of endpoints the way TCP does. Splitting
those streams into messages is the job of the layer above — for the
mini-protocols, the CBOR codec. See [Message delimiting](#message-delimiting).

The mux does not decide which mini-protocols run, when they start, or how they
are grouped. The node does that, and uses the mux as a service. See
[Protocol lifecycle](lifecycle.md).

This shows the arrangement for a typical node-to-node (NTN) connection. Every
mini-protocol, including [Handshake](../node-to-node/handshake), is a user of
the mux:

```mermaid
graph LR
  subgraph n1 [Node 1]
    direction LR
    HS1(Handshake)
    CS1(ChainSync)
    BF1(BlockFetch)
    Mux1[Multiplexer]

    HS1 <--> Mux1
    CS1 <--> Mux1
    BF1 <--> Mux1
  end

  subgraph n2 [Node 2]
    direction LR
    Mux2[Multiplexer]
    HS2(Handshake)
    CS2(ChainSync)
    BF2(BlockFetch)

    Mux2 <--> HS2
    Mux2 <--> CS2
    Mux2 <--> BF2
  end

  Mux1 <==> Mux2
```

## Packet format

A multiplexer packet (an SDU, service data unit) consists of an 8-byte header
followed by up to 65535 bytes of payload. Multiple payload segments can be
combined to form a full mini-protocol message, mini-protocol message boundaries
do not need to align with SDU boundaries.

```mermaid
packet-beta
    0-31: "Transmission time"
    32: "M"
    33-47: "Mini-protocol ID"
    48-63: "Payload length N"
    64-95: "Payload (variable length N)"
```

| Field             | Size | Meaning                                     |
| :---------------- | :--- | :------------------------------------------ |
| Transmission time | 32   | Sender’s monotonic clock, µsec, lowest 32 bits |
| M                 | 1    | Mode: 0 from initiator, 1 from responder    |
| Mini-protocol ID  | 15   | Mini-protocol ID (see below)                |
| Payload length    | 16   | Segment payload length (N) in bytes         |
| Payload           | N    | Raw payload data                            |

All fields are network/big-endian byte order.

The timestamp is the low 32 bits of the sender’s monotonic clock in
microseconds. It wraps every \(2^{32}\) µs, about **1 h 11 min 35 s**.
It is not a UTC Unix time: the network specification and the Haskell
mux both use the monotonic clock. How to turn the field into a
latency or bandwidth estimate is
[below](#using-the-transmission-time).

The wire format allows a payload of at most 65535 bytes. Implementations may
choose to send smaller SDUs, e.g. `cardano-node` uses 12288 bytes (three 4kiB
memory pages). This is not a protocol rule but a performance tuning parameter
trading local overhead for fairness between mini-protocols; the specific choice
will also depend on assumed minimum bearer bandwidth etc.

### Using the transmission time

The sender’s clock and the receiver’s clock do not share an epoch.
Subtracting the remote stamp from the local receive time is
meaningless. What can be compared is two **intervals**.

On each fully received SDU, record the remote stamp \(T\) and the
local monotonic time \(L\) of the trailing edge. In a short window
(much less than the wrap, so a few tens of seconds):

1. The first pair \((T_0, L_0)\) is the *reference*. It absorbs the
   unknown clock offset and the one-way delay of that first SDU.
2. A later pair \((T_1, L_1)\) gives a *relative* transit time

   \[
   t = (L_1 - L_0) - (T_1 - T_0).
   \]

   \(T_1 - T_0\) is an unsigned 32-bit subtraction of microsecond
   ticks, then converted to a duration. A wrap inside the window is
   then unambiguous.

That \(t\) is how much longer this SDU took than the reference, not
an absolute one-way delay. Clock drift over a tens-of-seconds window
is negligible.

Group observations by payload size. The **minimum** \(t\) versus
size is roughly a line: the intercept is extra path delay relative
to the reference, and the slope is serialisation time per byte.
The reciprocal of the slope is an estimate of **bandwidth**. Scatter
above the line is variable delay (queueing, competing traffic).

This use of the field is optional. The wire does not require a
receiver to compute it.

`KeepAlive` is a different instrument. It times a cookie from local
send to local matching reply — two-way delay on one clock — and
never looks at the SDU timestamp.

> [!NOTE]
>
> The Haskell mux does this as its DeltaQ trace: a 10 s sample
> window, then a line fit of minimum transit time against SDU size
> (\(G\) intercept, \(S\) octets per second).

### The mode bit

Each mini-protocol ID carries two independent instances, distinguished by the
mode bit `M`. `M` is 0 on segments sent by the *initiator* of that instance
(the side that has agency first) and 1 on segments sent by the *responder*.
It is not “who opened the TCP connection.”

On a duplex connection both nodes typically run both instances of a protocol
such as `ChainSync`. The two pairs share a protocol ID and are separated only
by `M`:

```mermaid
sequenceDiagram
    participant A as Node A
    participant B as Node B

    Note over A,B: Instance pair 1 — A is initiator
    A->>B: proto 2, M=0, MsgRequestNext
    B->>A: proto 2, M=1, MsgAwaitReply

    Note over A,B: Instance pair 2 — B is initiator
    B->>A: proto 2, M=0, MsgRequestNext
    A->>B: proto 2, M=1, MsgRollForward
```

A node that only runs initiator instances (initiator-only diffusion mode)
sends `M=0` and receives `M=1` for each protocol it uses. See
[Protocol lifecycle](lifecycle.md).

### Mini-protocol IDs

The mini-protocol ID is fixed for each NTN protocol:

| Mini-protocol                                 | ID  | Notes                         |
| :-------------------------------------------- | --: | :---------------------------- |
| [Handshake](../node-to-node/handshake)        |   0 |                               |
| (reserved)                                    |   1 | DeltaQ; not used by the bundle |
| [ChainSync](../node-to-node/chainsync)        |   2 |                               |
| [BlockFetch](../node-to-node/blockfetch)      |   3 |                               |
| [TxSubmission2](../node-to-node/txsubmission2) |   4 |                               |
| [KeepAlive](../node-to-node/keep-alive)       |   8 |                               |
| [PeerSharing](../node-to-node/peer-sharing)   |  10 | Optional after negotiation    |

An SDU with any other ID is a protocol error: the bearer is torn down.[^ntc]

## Message delimiting

The SDU header has no start-of-message flag and no “segment *k* of *n*”
counter. Messages are recovered from the per-instance byte stream:

1. Egress splits the bytes a mini-protocol wants to send into SDUs of at most
   the chosen payload size, all with the same protocol ID and `M`.
2. Ingress concatenates payloads that share that protocol ID and `M`, in
   arrival order.
3. The mini-protocol’s CBOR codec consumes a complete message from the front
   of that buffer and leaves any leftover bytes as the start of the next
   message.

Mux delivers SDUs of one instance in order. It does not parse CBOR beyond
recognising where an item ends.

The protocol handler only takes the next message when it has demand
(typically when it has agency). Bytes wait in the ingress buffer until
then; that is back-pressure into the mux.

## Flow control

Mini-protocols govern their own flow so one does not head-of-line-block
another. The mux enforces that with a **per-instance ingress buffer**.
If an arriving SDU would overflow it, the bearer is torn down.

The bound is chosen by the implementation, from how far it is prepared
to be pipelined on that protocol. When pipelining, size the buffer for
the outstanding requests (and replies) that may sit there. See
[Protocol pipelining](pipelining.md#ingress-buffers).

## Timeouts at the mux layer

The mux times *one SDU*, not the gap between SDUs.

Receiving an SDU has two phases:

1. **Waiting for the leading edge.** The mux waits, with no mux timer, until
   the first byte of the next SDU header arrives. That wait can be
   arbitrarily long. Mini-protocols that must bound "how long until the
   next message" do so with their own per-state timeouts.
2. **Assembling this SDU.** Once any header byte has been seen, the rest of
   the 8-byte header and the whole payload must arrive within a limit `T`.
   That is the time from the leading edge of this SDU to its trailing
   edge. The same `T` applies to *sending* an SDU: the write of that
   segment must finish within `T`.

If `T` is exceeded, the bearer is torn down.

| Phase of the connection | `T` | Applies to |
| ----------------------- | --: | :--------- |
| First Handshake on this bearer | 10s | each SDU sent or received |
| After that Handshake has finished | 30s | each SDU sent or received |

The 30s figure is a *minimum speed* on a single SDU, not a keep-alive.
A maximum-size SDU is 8 + 65535 bytes; finishing that in 30s is about
17 kbps. A slower peer can still idle between SDUs for as long as the
mini-protocol allows.

These values are bearer parameters, not fields in the SDU. The Haskell
node uses a 10s bearer only for the first Handshake, then starts the mux
on a 30s bearer. A later Handshake on that same mux therefore runs under
the 30s limit.

Handshake also has its own 10s per-state timeouts (`StPropose`,
`StConfirm`). Those bound waiting for a Handshake *message*, which is a
different clock from the mux SDU assembly timer. Other mini-protocols
likewise have per-state timeouts that are not mux rules.

## Fairness

SDUs are intentionally small so one mini-protocol cannot monopolize the
bearer while sending a large message. The wire allows 65535 bytes;
`cardano-node` uses 12288. That choice is not a protocol rule.

Queueing (round-robin, traffic classes, and so on) is an implementation
choice. A typical fair schedule takes at most one SDU from each ready
protocol in turn and skips a protocol that has nothing to send.

Small segments need not mean one system call each. The implementation
can write several ready SDUs to the bearer in one call.

## Errors

A mux error — unknown protocol ID, truncated SDU, SDU timeout, or an
overrun of a mini-protocol’s ingress buffer — is treated as a failure of the
whole bearer. The node then stops every mini-protocol on that connection.
See [Protocol lifecycle](lifecycle.md).

Ingress-buffer bounds and how they interact with sending several requests
ahead are described under [Protocol pipelining](pipelining.md).

[^agnostic]: Although the multiplexer is only used with mini-protocols in
    Cardano, it's actually completely agnostic as to data format.

[^ntc]: This documentation focuses on the NTN set of mini-protocols,
node-to-client connections (NTC) follow different rules.
