#!/usr/bin/env bash
set -euo pipefail

function print_usage() {
    echo "Usage: $0 <path> <optional-folder-name>"
    echo ""
    echo "Please specify a path towards your 1024x104 icon"
}

# If no arguments are passed, print usage
if [ "$#" -lt 1 ]; then print_usage; exit 1; fi

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$DIR/.."

# Set the CWD
cd "$ROOT"

BASE_ASSET_PATH="$1"; shift
MACOS_ASSETS_PATH="packaging/assets/icons/mac"

if [ -n "$1" ]; then
    MACOS_ASSETS_PATH="$1"/packaging/assets/icons/mac
    shift;
fi

# This script needs `imagemagick` (to be able to use the `convert` command), so check first if it's
# available.
if ! command -v convert -version &> /dev/null; then
    echo "Command \"convert\" could not be found! Is \"ImageMagick\" installed?"
    exit 1
fi

if ! command -v optipng &> /dev/null; then
    echo "Command \"optipng\" could not be found! Is it installed?"
    exit 1
fi

# This script needs to run on macOS (to be able to use the `iconutil` command), so check first if
# it's available.
if ! command -v iconutil &> /dev/null; then
    echo "Command \"iconutil\" could not be found! Please run this script on macOS and make sure to install Xcode Command Line Tools"
    exit 1
fi

echo "Starting build"

declare -a sizes=(16 32 64 128 256 512)

echo "Building \"custom-onprem.iconset\""
TEMP_ICONSET_PATH="$MACOS_ASSETS_PATH/custom-onprem.iconset"
mkdir -p "$TEMP_ICONSET_PATH";

# Build various sizes and write them to the temporary `iconset` directory.
for size in "${sizes[@]}"; do
    highres="$((size * 2))"

    file="$TEMP_ICONSET_PATH/icon_${size}x${size}.png"
    file_highres="$TEMP_ICONSET_PATH/icon_${size}x${size}@2x.png"

    convert "$BASE_ASSET_PATH" -resize x"$size" -strip "$file"
    convert "$BASE_ASSET_PATH" -resize x"$highres" -strip "$file_highres"

    optipng -o7 "$file"
    optipng -o7 "$file_highres"
done

iconutil -c icns -o "$MACOS_ASSETS_PATH/custom-onprem.icns" "$TEMP_ICONSET_PATH"

# Remove temporary `iconset` directory.
rm -r "$TEMP_ICONSET_PATH";
