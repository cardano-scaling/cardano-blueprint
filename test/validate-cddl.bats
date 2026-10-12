#!/usr/bin/env bats
#
# Validate CDDL specifications in the repository.
#
# Uses 'cddlc' to resolve module imports (;# import/include pragmas) and
# checks that no undefined names remain in the merged output.
#
# The era CDDL files are the vendored copies under src/ledger/eras, kept in
# sync with cardano-ledger by .github/workflows/sync-ledger-cddls.yaml. Only
# byron is downloaded: it lives elsewhere upstream and is frozen.
#
# Run with: bats validate-cddl.bats
# Requirements: bats, cddlc, curl

REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
LEDGER_RAW="https://raw.githubusercontent.com/IntersectMBO/cardano-ledger/master"

# Local CDDL files imported by the entry points below.
# cddlc resolves ';# import/include MODULE as PREFIX' by looking for MODULE.cddl
# in CDDL_INCLUDE_PATH. All modules are copied into one flat directory together
# with the era files so that cddlc needs only a single lookup path.
# Add new files here when new modules are introduced.
LOCAL_MODULES=(
  src/codecs/base.cddl
  src/network/node-to-node/blockfetch/block.cddl
  src/network/node-to-node/chainsync/header.cddl
  src/network/node-to-node/txsubmission2/tx.cddl
  src/network/node-to-node/txsubmission2/txid.cddl
  src/ledger/eras/allegra.cddl
  src/ledger/eras/alonzo.cddl
  src/ledger/eras/babbage.cddl
  src/ledger/eras/conway.cddl
  src/ledger/eras/dijkstra.cddl
  src/ledger/eras/mary.cddl
  src/ledger/eras/shelley.cddl
)

@test "network/node-to-node/blockfetch/messages.cddl" {
  validate_cddl src/network/node-to-node/blockfetch/messages.cddl
}

@test "network/node-to-node/chainsync/messages.cddl" {
  validate_cddl src/network/node-to-node/chainsync/messages.cddl
}

@test "network/node-to-node/handshake/messages.cddl" {
  validate_cddl src/network/node-to-node/handshake/messages.cddl
}

@test "network/node-to-node/keep-alive/messages.cddl" {
  validate_cddl src/network/node-to-node/keep-alive/messages.cddl
}

@test "network/node-to-node/txsubmission2/messages.cddl" {
  validate_cddl src/network/node-to-node/txsubmission2/messages.cddl
}

@test "network/node-to-node/leios-notify/messages.cddl" {
  validate_cddl src/network/node-to-node/leios-notify/messages.cddl
}

@test "network/node-to-node/leios-fetch/messages.cddl" {
  validate_cddl src/network/node-to-node/leios-fetch/messages.cddl
}

@test "client/node-to-client/state-query/messages.cddl" {
  validate_cddl src/client/node-to-client/state-query/messages.cddl
}

setup_file() {
  INCLUDE_DIR="$(mktemp -d)"
  export INCLUDE_DIR

  echo "# Copying local CDDL modules into include directory..." >&3
  for f in "${LOCAL_MODULES[@]}"; do
    cp "$REPO_ROOT/$f" "$INCLUDE_DIR/"
  done

  echo "# Downloading byron CDDL from cardano-ledger..." >&3
  curl -sSfL "$LEDGER_RAW/eras/byron/ledger/impl/cddl-spec/byron.cddl" -o "$INCLUDE_DIR/byron.cddl"

  echo "# INCLUDE_DIR=$INCLUDE_DIR" >&3
}

teardown_file() {
  rm -rf "$INCLUDE_DIR"
}

# Run cddlc on a CDDL file and fail if any names are undefined.
# Usage: validate_cddl <path-relative-to-REPO_ROOT>
validate_cddl() {
  local rel="$1"
  local file="$REPO_ROOT/$rel"

  run bash -c "CDDL_INCLUDE_PATH='$INCLUDE_DIR' cddlc -u -2 -t cddl '$file' 2>&1"
  echo "$output"
  [ "$status" -eq 0 ]
  [[ "$output" != *"*** undefined"* ]]
}
