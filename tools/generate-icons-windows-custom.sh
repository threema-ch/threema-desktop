#!/usr/bin/env bash
set -euo pipefail

function print_usage() {
    echo "Usage: $0 <logo-path> <square-logo-path> <optional-out-folder>"
    echo ""
    echo "Please specify a path towards your 1024x104 icon and the square store logo"
}

if [ "$#" -lt 2  ]; then print_usage; exit 1; fi

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$DIR/.."

# Set the CWD
cd "$ROOT"

# This script needs `imagemagick` (to be able to use the `convert` command), so check first if it's
# available.
if ! command -v convert -version &> /dev/null; then
    echo "Command \"convert\" could not be found! Is \"ImageMagick\" installed?"
    exit 1
fi

# This script needs the `icotool` utility to be installed. On Arch, it's included in the `icoutils`
# package.
if ! command -v icotool &> /dev/null; then
    echo "Command \"icotool\" could not be found! Is it installed?"
    exit 1
fi

if ! command -v optipng &> /dev/null; then
    echo "Command \"optipng\" could not be found! Is it installed?"
    exit 1
fi

BASE_ASSET_PATH="$1"; shift
SQUARE_ASSET_PATH="$1"; shift

WIN_ASSETS_PATH="packaging/assets/icons/win"
ASSETS_PATH="src/public/res/icons/msix"

if [ -n "$1" ]; then
    WIN_ASSETS_PATH="$1"/packaging/assets/icons/win
    ASSETS_PATH="$1"/src/public/res/icons/msix
    shift;
fi

#
# Generate ICO bundles
#

echo "Starting ICO build"

declare -a sizes=(16 32 64 128 256)

# Generate assets for every combination, except "consumer-onprem" (which doesn't exist).
echo "Building \"custom-onprem\""

TEMP_PATH="$WIN_ASSETS_PATH/custom-onprem"

echo "$TEMP_PATH"
mkdir -p "$TEMP_PATH";

# Build various sizes and write them to the temporary asset directory.
files=()
for size in "${sizes[@]}"; do
    file="$TEMP_PATH/icon_${size}x${size}.png"
    convert "$BASE_ASSET_PATH" -resize x"$size" -strip "$file"
    optipng -o7 "$file"
    files+=("$file")
done

# Convert each set of icons to an `ico` package.
icotool -c -o "$WIN_ASSETS_PATH/custom-onprem.ico" "${files[@]}"

# Remove temporary directory.
rm -r "$TEMP_PATH";

#
# Generate MSIX icon sets
#

echo "Starting MSIX icon set build"

OUTPUT_PATH="$ASSETS_PATH/custom-onprem"
mkdir -p "$OUTPUT_PATH";

# 1. Generate `Square44x44Logo.png` variants.

# Generate base file.
file="$OUTPUT_PATH/Square44x44Logo.png"
convert "$BASE_ASSET_PATH" -resize x44 -strip "$file"
optipng -o7 "$file"

declare -a themes=("altform-unplated" "altform-lightunplated")
declare -a sizes=(16 20 24 30 32 36 40 44 48 60 64 72 80 96 256)

# Build alternative sizes and write them to the target asset directory.
for size in "${sizes[@]}"; do
    file="$OUTPUT_PATH/Square44x44Logo.targetsize-${size}.png"
    convert "$BASE_ASSET_PATH" -resize x"$size" -strip "$file"
    optipng -o7 "$file"

    for theme in "${themes[@]}"; do
        file="$OUTPUT_PATH/Square44x44Logo.targetsize-${size}_${theme}.png"
        convert "$BASE_ASSET_PATH" -resize x"$size" -strip "$file"
        optipng -o7 "$file"
    done
done

# 2. Generate `Square150x150Logo.png` variant.
file="$OUTPUT_PATH/Square150x150Logo.png"
convert "$BASE_ASSET_PATH" -resize x150 -strip "$file"
optipng -o7 "$file"

# 3. Generate store logo.

file="$OUTPUT_PATH/StoreLogo.png"
convert "$SQUARE_ASSET_PATH" -resize x150 -strip "$file"
optipng -o7 "$file"
