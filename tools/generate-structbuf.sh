#!/usr/bin/env bash
#
# Generate structbuf bindings.
set -euo pipefail

function print_usage() {
    echo "Usage: $0 <path-to-structbuf-typescript-bin.js> <path-to-threema-protocols>"
}

# If no arguments are passed, print usage
if [ "$#" -lt 2 ]; then print_usage; exit 1; fi

# Parse arguments
structbuf_typescript="$1"; shift
protocols_dir="$1"; shift

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$DIR/.."

# Set the CWD
cd "$ROOT"

# Generate
$structbuf_typescript \
    "${protocols_dir}"/src/*.struct.yml \
    -o "$ROOT"/src/common/network/structbuf \
    --new-type true \
    --byte-length true \
    --snapshot true \
    --clone true \
    --base-class Struct="~/common/network/structbuf/base" \
    --external-import types="~/common/types"

# Prettify
npx prettier --write "$ROOT/src/common/network/structbuf/**/*.ts"
