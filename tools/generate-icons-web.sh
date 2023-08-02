#!/usr/bin/env bash
set -euo pipefail

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$DIR/.."

# Set the CWD
cd "$ROOT"

BASE_ASSETS_PATH="packaging/assets/icons/base"
ASSETS_PATH="src/public/res/icons"

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
declare -a sizes=(64 128 180 192 256 512)

for variant in "${variants[@]}"; do
  for environment in "${environments[@]}"; do
    echo "Building \"$variant-$environment\""
    
    OUTPUT_PATH="$ASSETS_PATH/$variant-$environment"
    mkdir -p "$OUTPUT_PATH";

    # Build various sizes and write them to the temporary asset directory.
    for size in "${sizes[@]}"; do
      file="$OUTPUT_PATH/icon-${size}.png"
      convert "$BASE_ASSETS_PATH/icon-$variant-$environment-1024.png" -resize x"$size" -strip "$file"
      optipng -o7 "$file"
    done
  done
done

# Copy monochrome icon to the target directory.
cp "$BASE_ASSETS_PATH/icon-monochrome-square.svg" "$ASSETS_PATH/icon-monochrome-square.svg"
