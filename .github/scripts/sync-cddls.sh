#!/usr/bin/env bash
#
# Overwrite the vendored CDDLs with their upstream copies.
#
# Usage: sync-cddls.sh ledger|consensus REF
#
# REF is a branch, tag or commit of IntersectMBO/cardano-ledger or
# IntersectMBO/ouroboros-consensus. A file missing upstream keeps its local copy.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 ledger|consensus REF" >&2
  exit 1
fi
repo="$1"
ref="$2"

# Upstream path, then the path here.
case "$repo" in
  ledger)
    base="https://raw.githubusercontent.com/IntersectMBO/cardano-ledger/$ref"
    files=()
    for era in allegra alonzo babbage conway dijkstra mary shelley; do
      files+=("eras/$era/impl/cddl/data/$era.cddl src/ledger/eras/$era.cddl")
    done
    ;;
  consensus)
    base="https://raw.githubusercontent.com/IntersectMBO/ouroboros-consensus/$ref/ouroboros-consensus-cardano/cddl"
    files=(
      "base.cddl src/codecs/base.cddl"
      "node-to-node/blockfetch/block.cddl src/network/node-to-node/blockfetch/block.cddl"
      "node-to-node/chainsync/header.cddl src/network/node-to-node/chainsync/header.cddl"
      "node-to-node/txsubmission2/tx.cddl src/network/node-to-node/txsubmission2/tx.cddl"
      "node-to-node/txsubmission2/txId.cddl src/network/node-to-node/txsubmission2/txid.cddl"
      "node-to-node/leiosfetch/leiosFetch.cddl src/network/node-to-node/leios-fetch/messages.cddl"
      "node-to-node/leiosnotify/leiosNotify.cddl src/network/node-to-node/leios-notify/messages.cddl"
    )
    ;;
  *)
    echo "Unknown repository '$repo', expected 'ledger' or 'consensus'" >&2
    exit 1
    ;;
esac

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
for file in "${files[@]}"; do
  read -r src dest <<< "$file"
  status="$(curl -sSL -o "$tmp" -w '%{http_code}' "$base/$src")"
  case "$status" in
    200)
      mkdir -p "$(dirname "$dest")"
      cp "$tmp" "$dest"
      ;;
    404)
      echo "No '$src' at $repo@$ref, keeping '$dest'"
      ;;
    *)
      echo "Fetching '$src' at $repo@$ref failed with HTTP $status" >&2
      exit 1
      ;;
  esac
done
