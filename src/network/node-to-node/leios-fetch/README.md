# LeiosFetch

**Mini-protocol number: 19**

> [!WARNING]
>
> This protocol is **proposed** and not yet part of the Cardano mainnet. It is
> specified as part of [Leios (CIP-0164)](https://github.com/cardano-foundation/CIPs/pull/1167),
> an extension to the Ouroboros consensus protocol aimed at significantly
> increasing transaction throughput. Details are subject to change.

`LeiosFetch` is the mini-protocol responsible for fetching Endorser Blocks (EBs)
and their transaction payloads from peers. It is a pull-based protocol: the
client explicitly requests either a full EB or a subset of its transactions
(identified by a bitmap), and the server streams the response.

EBs are discovered via [LeiosNotify](../leios-notify/README.md); once a node
decides it wants a block or its transactions, it uses `LeiosFetch` to retrieve
the data.

## State machine

```mermaid
graph LR
   classDef client color:black,fill:PaleGreen,stroke:DarkGreen;
   classDef server color:black,fill:PowderBlue,stroke:DarkBlue;
   linkStyle default stroke:gray

   StDone(((StDone)))

   i(( )) --> StIdle
   StIdle --MsgDone--> StDone
   StIdle --MsgLeiosBlockRequest--> StBlock
   StBlock --MsgLeiosBlock--> StIdle

   StIdle --MsgLeiosBlockTxsRequest--> StBlockTxs
   StBlockTxs --MsgLeiosBlockTxs--> StIdle

   class StIdle client
   class StBlock,StBlockTxs server
```

### State agencies

| State        | Agency                                          |
| :----------- | :---------------------------------------------- |
| StIdle       | <span class="agency-initiator">Initiator</span> |
| StBlock      | <span class="agency-responder">Responder</span> |
| StBlockTxs   | <span class="agency-responder">Responder</span> |
| StVotes      | <span class="agency-responder">Responder</span> |
| StBlockRange | <span class="agency-responder">Responder</span> |

### State transitions

| From state | Message                 | Parameters                    | To state   |
| :--------- | :---------------------- | ----------------------------- | :--------- |
| StIdle     | MsgClientDone           |                               | End        |
| StIdle     | MsgLeiosBlockRequest    | `point`                       | StBlock    |
| StBlock    | MsgLeiosBlock           | `endorser_block`              | StIdle     |
| StIdle     | MsgLeiosBlockTxsRequest | `point`, `bitmaps`            | StBlockTxs |
| StBlockTxs | MsgLeiosBlockTxs        | `point`, `bitmaps`, `tx_list` | StIdle     |

## Codecs

The messages depicted in the state machine follow this CDDL specification:

```cddl
;; messages.cddl
{{#include messages.cddl}}
```

> [!NOTE]
>
> The CBOR tags in this specification are provisional (`MsgClientDone` at `[9]`
> in particular). The `endorser_block`, `bitmaps`, and `tx` types remain
> underspecified (`any`) pending further protocol design, including the
> length-definite encoding for `txList`. Additionally, the protocol is known
> to be incomplete: catch-up oriented batch request messages are likely to be
> added, and the bitmap-based transaction request structure
> (`MsgLeiosBlockTxsRequest`) may change significantly as the roaring bitmap
> encoding is still under discussion. See
> [CIP-0164 PR #1167](https://github.com/cardano-foundation/CIPs/pull/1167)
> for the latest design decisions.
