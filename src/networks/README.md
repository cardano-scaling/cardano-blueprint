# Cardano Testnet Purpose and Upgrade Policy

## Why this policy?

Cardano's testnets have historically operated without a formalised statement of
purpose or upgrade policy.
As a result, the ecosystem has lacked a shared understanding of what each
network is for, who it serves, and how and when it will be upgraded.

This document sets out that purpose and upgrade policy so that developers,
stake pool operators, exchanges, and tooling providers can plan their own work
with confidence and rely on predictable network behaviour.

## Historical Context

Cardano originally ran a single public testnet.
That network eventually became unrecoverable,
and at around the same time there was demand for a network with shorter epochs
to speed up testing.
Out of this, two replacement networks were created:

- **Preview:** an early, faster-moving network for testing against upcoming
  node and protocol releases ahead of production.
- **PreProd:** a production-like staging network that mirrors mainnet as closely
  as possible for final validation before a mainnet upgrade.

## Comparison Table

| | Preview | PreProd | Alternate (e.g. SanchoNet, DijkstraNet) |
| --- | --- | --- | --- |
| **Purpose** | Test upcoming releases and features ahead of production | Production-like final staging before mainnet | Bleeding-edge testing of specific new features |
| **Parameters** | Mainnet-like, one-day epochs | Match mainnet, five-day epochs | Tailored, may diverge from mainnet |
| **Targeted node version** | Mainnet-ready candidates, ahead of mainnet | Mainnet-ready (current or next mainnet) | Any, often very early or experimental |
| **Stake distribution** | Majority controlled by IO | Majority controlled by IO | Small set of SPOs |
| **Maintenance** | IO-maintained (block producers, relays, faucet, governance) | IO-maintained (block producers, relays, faucet, governance) | Maintained by the sponsoring feature team or community members |
| **Desired participants** | dApp developers, tooling, SPOs validating early | SPOs, exchanges, dApp operators doing final testing | Core developers, feature teams, early adopters |
| **Long-lived** | Yes | Yes | Unlikely |
| **Hard forks** | Yes — generally forks first | Yes — after Preview, before mainnet | Not formally |
| **Upgrade timeline** | At least three months before mainnet | At least one month before mainnet | Follows feature needs |

## Preview Testnet

### Purpose

Preview is the forward-looking public testnet.
It exists so the ecosystem can exercise upcoming node releases and protocol
features before they reach production,
giving developers and operators time to adapt.

Its faster epochs let participants observe epoch-boundary behaviour like
rewards, parameter updates, and era transitions daily.

### Parameters

Protocol parameters track mainnet closely,
but epochs are shorter (one day, versus five days on mainnet) to speed up
iteration.

### Nodes

Mainnet-ready release candidates,
run ahead of mainnet.

Majority of stake controlled by IO.

### Maintenance

IO commits to maintaining the core network infrastructure:
running a majority of block producers,
operating public relays,
supporting governance actions,
and providing the testnet faucet.

### Desired Participants

Everyone who wants to test new features.

### Long-lived

Yes.
Preview is intended to be long-lived,
stability is not a guaranteed, but it is not reset under normal circumstances.

### Hard Forks

Used in the hard-fork process: yes

Preview is generally hard-forked to a new protocol version first,
ahead of PreProd and mainnet.

Upgrade timeline: hard-forked at least three months before the corresponding
mainnet hard fork,
guaranteeing the ecosystem a minimum three-month testing window.

## PreProd Testnet

### Purpose

PreProd is the production-like staging network.
It mirrors mainnet configuration as faithfully as possible so that releases can
be validated under realistic conditions before they are deployed to mainnet.
It is the last checkpoint before a change reaches production.

### Parameters

Protocol parameters match mainnet,
including a five-day epoch length,
so that behaviour observed here is representative of mainnet.

### Targeted Node Version

Mainnet-ready.
PreProd runs the node version currently deployed to (or next heading for)
mainnet, matching production as closely as possible.

Majority of stake controlled by IO.

### Maintenance

IO commits to maintaining the core network infrastructure:
running a majority of block producers,
operating public relays,
supporting governance actions,
and providing the testnet faucet.

### Desired Participants

Stake pool operators, exchanges, and dApp operators who need a mainnet-faithful
environment for final integration testing and release rehearsal.

### Long-lived

Yes.
PreProd is long-lived and stable, supporting persistent infrastructure that
mirrors a participant's mainnet setup.

### Hard Forks

Used in the hard-fork process: yes.
PreProd is hard-forked to a new protocol version after Preview and before
mainnet, serving as the final rehearsal of the upgrade.

Upgrade timeline: hard-forked at least one month before the corresponding
mainnet hard fork,
guaranteeing a minimum one-month final validation window.

## Alternate Testnets

i.e. SanchoNet, DijkstraNet

### Purpose

Purpose-built networks that can target anything.
They are typically bleeding-edge networks spun up to develop and test specific
new features or releases.

### Parameters

Parameters are tailored to whatever the network is testing and may diverge
significantly from mainnet.

### Targeted Node Version

Any, often very early or experimental builds.
The node version follows the needs of the feature under development rather than
the production release schedule.

Small set of SPOs.

### Desired Participants

Core developers, feature teams, and early adopters who want to engage with a
specific new capability while it is still under active development.

### Long-lived

Unlikely.
These networks are usually created for a particular purpose and are likely
to be reset often.

### Hard Forks

Used in the hard-fork process: not formally.
Their upgrade cadence follows the needs of the feature being developed rather
than the production release process.
