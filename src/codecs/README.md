# Codec basics

Common encoding format and binary interface description used across blueprints.

## CBOR

TODO: justify the use of CBOR and briefly describe it. Mention `cbor2diag.rb`
and related tools. (I believe it is the `cbor-tools` Ruby gem).

## CDDL

CDDLs are often times the combination of partial CDDLs definitions
from Network, Consensus and Ledger layers. To combine all these, we
will make use of the `cddlc` tool specified in [this
RFC](https://datatracker.ietf.org/doc/draft-ietf-cbor-cddl-modules/). This
tool provide meaning to the `;# import` and `;# include` directives to
have a modular system over CDDL definitions.

The CDDL specs presented in this section will make use of the
following base definitions that we will consider defined globally:

```cddl
{{#include base.cddl:21:}}
```

In addition, we add the following types to represent tag-encoded
alternatives, commonly used at the consensus level to encode a
different tag for each one of the eras in the Cardano blockchain:

```cddl
{{#include base.cddl:1:19}}
```

These definitions are made available in the
[`base.cddl`](base.cddl)
file which we will import qualified with `;# import base as base`.

On the other side, Ledger CDDL specs are fully self-contained for each
era, hence there are repetitions of basic types, which we will bring
in qualified by the era name. We will usually import the Ledger CDDLs as:

```cddl
;# include byron as byron
;# include shelley as shelley
;# include allegra as allegra
;# include mary as mary
;# include alonzo as alonzo
;# include babbage as babbage
;# include conway as conway
```
