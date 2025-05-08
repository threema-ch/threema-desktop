#!/usr/bin/env bash
set -euo pipefail

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$DIR/.."

function print_usage() {
    echo "Usage: $0 [OPTIONS] <path-to-libthreema> [<commit-like>]"
    echo ""
    echo "Options:"
    echo " --no-container: Don't use Docker container to build libthreema."
    echo " -h / --help: Print this help."
}

# If no arguments are passed, print usage
if [ "$#" -lt 1 ]; then print_usage; exit 1; fi

# Parse optional arguments
use_devcontainer="yes"
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h|--help) print_usage; exit 0 ;;
        --no-container) use_devcontainer="no"; shift ;;
        *)
            if [[ "$1" =~ ^- ]]; then
                echo "Invalid option: $1"
                print_usage
                exit 1
            else
                break
            fi
            ;;
    esac
done

# Parse positional arguments
libthreema_dir="$1"; shift
commit_like=""
if [ "$#" -eq 1 ]; then
    commit_like="$1"; shift
fi

echo -n "Copying and building libthreema from $libthreema_dir with "
if [ "$use_devcontainer" = "yes" ]; then echo "devcontainer"; else echo "local toolchain"; fi

# Move to libthreema for checkout
cd "$libthreema_dir"

# Check that the repo is clean
if [ -n "$(git status --porcelain)" ]; then
    echo libthreema has changes, please commit them
    exit 1
fi

# Checkout the given commit-like
if [ "$commit_like" != "" ]; then
    git fetch
    git checkout "$commit_like"; shift
fi

# Ensure that required submodule is checked out
submodule_status=$(git submodule status threema-protocols 2>/dev/null)
if [[ $submodule_status =~ ^- ]]; then
    echo "Submodule 'threema-protocols' in libthreema is not initialized."
    echo "Please run 'git submodule update --init' in the libthreema directory at $libthreema_dir."
    exit 1
fi

# Move to libthreema folder
cd "$ROOT"/libs/libthreema

# Remove all files except wasm/web
find . -path './wasm/web/*' -prune -o -type f -exec rm -f {} +
find . -type d -empty -delete

rsync -a "$ROOT/$libthreema_dir/" .

# Run the libthreema build command
if [ "$use_devcontainer" = "yes" ]; then
    if (! docker stats --no-stream > /dev/null ); then
        echo "Please start the docker daemon to build libthreema"
        exit 1
    fi
    ./tools/build-wasm.sh --target=web
else
    ./tools/build-wasm.sh --target=web --no-container
fi

# Move the build into the folder where the package.json is
mv build/wasm/web/* wasm/web

# Ensure the build is not deleted
git add wasm

# Clean up libthreema
./.prepare-submodule-publish.sh --yes

# Add required wasm target to rust toolchain file
echo 'targets = ["wasm32-unknown-unknown"]' >> rust-toolchain.toml

echo "Successfully built libthreema and prepared it for publishing"
