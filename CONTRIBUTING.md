# Contributing to Cardano Blueprint

Thank you for considering contributing and sharing your knowledge about the Cardano protocol in one capacity or another.

There are basically two ways to contribute:

- Validate and provide feedback about existing blueprints
- Create or update blueprints

## Validate blueprints

As you might have seen, the [goal](https://cardano-scaling.github.io/cardano-blueprint/#goal) of `cardano-blueprint` is to create accessible assets that are _understandable_ and _useful_ to wide variety of builders from the Cardano community.

### Ask questions

A great way to make sure we cover relevant areas of the Cardano protocol first, is to understand what _you_ are trying to build or understand _right now_.

We use [Q&A discussions](https://github.com/cardano-scaling/cardano-blueprint/discussions/new?category=q-a) to gather immediate questions and use them to identify gaps for where blueprints can help most.

While discussions and providing answers in the [Q&A forum](https://github.com/cardano-scaling/cardano-blueprint/discussions/categories/q-a) are obviously welcome, ideally we would be [writing blueprints](#write-blueprints) and be able to answer by pointing future readers there.

### Share feedback and ideas

If you happen to find the information provided through blueprints _useful_ to your current project, or if you are confused about the _why_ of blueprints, the [general category](https://github.com/cardano-scaling/cardano-blueprint/discussions/categories/general) is the right place for that.

Or maybe you have an idea on how we could reach our [goals](https://cardano-scaling.github.io/cardano-blueprint/#goal) by changing one or the other process? Ideas are collected in the [ideas category](https://github.com/cardano-scaling/cardano-blueprint/discussions/categories/ideas).

We would love to hear about any feedback! 💙

### Report issues

[Submit an issue](https://github.com/cardano-scaling/cardano-blueprint/issues/new) if you spot an errors, or should you encounter a problem with using or contributing to the blueprints themselves.

## Write blueprints

Creating or updating blueprints is the bread & butter of this project and anyone is invited to do just that!

The bandwidth of possible contributions is very broad and can range from fixing typos via the `Suggest an edit` <i class="fa fa-edit"></i> button on the [rendered website](https://cardano-scaling.github.io/cardano-blueprint), over contributing a whole set of documents about how consensus works in Cardano, to including a conformance test suite.

In fact, it's not even set in stone [what a blueprint is](https://cardano-scaling.github.io/cardano-blueprint/#what-is-a-blueprint), and we are gladly exploring any asset that you think covers our values and contributes to reaching the goal of the Cardano Blueprint initiative.

### Creating a pull request

Thank you for contributing your changes by opening a pull request!

We do appreciate it if your pull request meets the following criteria:

- **Description of the changes**: providing a clear summary of the changes is beneficial
- **Quality of changes**: ensure that new or updated automated tests validate your changes
- **Scope**: we prefer multiple pull requests that are well-scoped rather than a single large one
- **Correctness**: the pull request should pass the continuous integration (CI) pipeline.

The project is currently in an expand-and-gather phase with no requirement of approvals, but consider requesting for reviews on Github-suggested reviewers.

Anyone is free to fork the repository and we consider pull requests from forks.

The project is currently situated in the `cardano-scaling` organization, to which we happily invite you and give write permissions onto this repository - so you can pull request from branches directly.

### Review contributions

The Cardano Blueprint aims to be a community effort and we would love to have you become a regular visitor and maybe even reviewer of new contributions! 🤝

## Building the book

The blueprints are written using markdown and can be viewed [directly in
Github](https://github.com/cardano-scaling/cardano-blueprint/tree/main/src/introduction)
or built into [the HTML
site](https://cardano-scaling.github.io/cardano-blueprint) using [mdbook].

### With nix

```shell
nix build -o out
```

### With cargo

You can install [mdbook] and the plugins we use with `cargo`:

```shell
cargo install mdbook mdbook-katex mdbook-mermaid mdbook-toc
```

Then build with:

```shell
mdbook build
```

## Editing

With [mdbook] installed or inside a `nix develop` shell, you can live-preview
the result with:

```shell
mdbook serve --open
```

See the [mdbook manual][mdbook] or [GitHub flavored markdown][gfm] for more
information on what is available.

### Formatting & spell checking

We use `treefmt` which runs formatting and spell checking tools. This is also
enforced in CI. With `nix develop` active:

```shell
treefmt
```

<!-- markdown-link-check-disable -->

See `formattingPkgs` in [`flake.nix`](./flake.nix) for the full list of tools.

<!-- markdown-link-check-enable -->

## Running tests

<!-- markdown-link-check-disable -->

The repository includes a test suite under [`test/`](test/README.md) that validates the CDDL specifications for consistency. With `nix develop` active, run:

<!-- markdown-link-check-enable -->

```shell
bats test/validate-cddl.bats
```

These tests also run automatically in CI on every pull request and push to `main`.

### Upstream format changes

The CDDLs under `src/ledger/eras` and the hard-fork combinator modules are
copies of their `cardano-ledger` and `ouroboros-consensus` versions. To explain
an upstream format change, push a branch with the same name as the upstream
one: CI commits that branch's CDDLs onto yours whenever you push, or when you
run the "Sync CDDLs from same-named upstream branches" workflow by hand.

## Publishing

Any changes to the `main` branch are automatically published to the live version of the blueprints hosted [via Github Pages](https://cardano-scaling.github.io/cardano-blueprint/). If you have made changes and they are not propagated to the live version, please check the build status on [GitHub Actions](https://github.com/cardano-scaling/cardano-blueprint/actions), or make sure you fully reload the webpage (Ctrl+Shift+R on firefox).

## Versioning

The Cardano Blueprint is currently _not_ versioned, tagged or released.

We are prepared to put such process in place as we see demand from implementations relying on a specific version of test data, interface descriptions or similar contained in `cardano-blueprint`.

## Communication

Besides the many ways to engage through issues and discussions, we also use text and video channels on the [Cardano Scaling Discord server](https://discord.gg/47YkBFaTtT) for informal chats.

There is a weekly [office hours event](https://discord.gg/xvmdpdsM?event=1346780137806626816) to which anyone is welcome and we are looking forward to see you there!

Last but not least and probably the best way to contribute: Share the love for blueprints! 📘📐💙

[gfm]: https://github.github.com/gfm/
[mdbook]: https://rust-lang.github.io/mdBook/index.html
