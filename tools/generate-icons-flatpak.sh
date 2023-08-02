#!/usr/bin/env bash
set -euo pipefail

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$DIR/.."

# Set the CWD
cd "$ROOT"

BASE_ASSETS_PATH="packaging/assets/icons/base"
FLATPAK_ASSETS_PATH="packaging/assets/icons/flatpak"

# This script needs `imagemagick` (to be able to use the `convert` command), so check first if it's
# available.
if ! command -v convert -version &> /dev/null; then
    echo "Command \"convert\" could not be found! Is \"ImageMagick\" installed?"
    exit
fi

if ! command -v optipng &> /dev/null; then
    echo "Command \"optipng\" could not be found! Is it installed?"
    exit
fi

echo "Starting build"

declare -a variants=("consumer" "work")
declare -a environments=("live" "sandbox")

for variant in "${variants[@]}"; do
  for environment in "${environments[@]}"; do
    echo "Building \"$variant-$environment\""

    # Generate correct size and save it to the target directory.
    file="$FLATPAK_ASSETS_PATH/$variant-$environment.png"
    convert "$BASE_ASSETS_PATH/icon-$variant-$environment-1024.png" -resize x512 -strip "$file"
    optipng -o7 "$file"

    # Copy `svg` asset to the target directory.
    cp "$BASE_ASSETS_PATH/icon-$variant-$environment.svg" "$FLATPAK_ASSETS_PATH/$variant-$environment.svg"
  done
done
