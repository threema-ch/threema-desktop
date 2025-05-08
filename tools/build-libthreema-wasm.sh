#!/usr/bin/env bash
set -euo pipefail

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$DIR/.."
cd "$ROOT"

echo "Building libthreema using local toolchain"

# Build libthreema as WASM
cd "${ROOT}/libs/libthreema/"
./tools/build-wasm.sh --target=web --no-container

# Move the build into the folder where the package.json is
mkdir -p "${ROOT}/libs/libthreema/wasm/web"
mv "${ROOT}/libs/libthreema/build/wasm/web/"* "${ROOT}/libs/libthreema/wasm/web"

echo "Successfully built libthreema"
