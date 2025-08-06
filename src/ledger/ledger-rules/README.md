# Ledger Rules

This section details the ledger rules used in Cardano and, especially, some of the potential "land mines" one could run into when implementing these rules.

The ledger rules will be organized in a potentially unique way. Instead of grouping them based on inference rules defined in the [Cardano Ledger Specification](https://intersectmbo.github.io/formal-ledger-specifications/cardano-ledger.pdf) or some arbitrary implementation of said specification, they are grouped based on their responsibility throughout the validation process. For example, "Witness Validation" contains several rules related to validating the transaction witness set.

## What is a "Land Mine"?
In this context, a "Land Mine" is a part of the ledger rules that could cause confusion or are easy to get wrong. This could be a discrepency between the Haskell implementation and the formal specification (A bug or otherwise), some unintended behavior that resulted from an edge case that was not considered during initial implementation, or simply something that caused an issue for some alternative node implementors, and therefore should be documented for the future implementors.
