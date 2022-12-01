#!/usr/bin/env bash
set -euo pipefail

function print_usage() {
    echo "Usage: $0 (consumer|work) (sandbox|live) [args..]"
    echo ""
    echo "If [args..] are passed in, they are forwarded to the Threema application."
}

# If no arguments are passed, print usage
if [ "$#" -lt 2 ]; then print_usage; exit 1; fi

# Parse arguments
variant="$1"; shift
environment="$1"; shift

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$DIR/.."
cd "$ROOT"

# Export GIT_DESCRIBE variable
GIT_DESCRIBE=$(git describe --always --dirty || true)
export GIT_DESCRIBE

# Build main, preload and app
VITE_MAKE=electron,electron-main,$variant,$environment npx vite build -m development -c config/vite.config.ts
VITE_MAKE=electron,electron-preload,$variant,$environment npx vite build -m development -c config/vite.config.ts
VITE_MAKE=electron,app,$variant,$environment tools/run-with-vite.cjs -m development -c config/vite.config.ts -r electron -p electron.pid -- . $*
