#!/usr/bin/env bash
set -euo pipefail

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$DIR/.."

# Set the CWD
cd "$ROOT"

BASE_ASSETS_PATH="packaging/assets/icons/base"
MACOS_ASSETS_PATH="packaging/assets/icons/mac"

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

# This script needs to run on macOS (to be able to use the `iconutil` command), so check first if
# it's available.
if ! command -v iconutil &> /dev/null; then
    echo "Command \"iconutil\" could not be found! Please run this script on macOS and make sure to install Xcode Command Line Tools"
    exit
fi

echo "Starting build"

declare -a variants=("consumer" "work")
declare -a environments=("live" "sandbox" "onprem")
declare -a sizes=(16 32 64 128 256 512)

for variant in "${variants[@]}"; do
  for environment in "${environments[@]}"; do
    # Generate assets for every combination, except "consumer-onprem" (which doesn't exist).
    if ! [[ "$variant" == "consumer" && "$environment" == "onprem" ]]; then
      echo "Building \"$variant-$environment.iconset\""

      TEMP_ICONSET_PATH="$MACOS_ASSETS_PATH/$variant-$environment.iconset"
      mkdir -p "$TEMP_ICONSET_PATH";

      # Build various sizes and write them to the temporary `iconset` directory.
      for size in "${sizes[@]}"; do
        highres="$((size * 2))"

        file="$TEMP_ICONSET_PATH/icon_${size}x${size}.png"
        file_highres="$TEMP_ICONSET_PATH/icon_${size}x${size}@2x.png"

        convert "$BASE_ASSETS_PATH/icon-$variant-$environment-1024-macos.png" -resize x"$size" -strip "$file"
        convert "$BASE_ASSETS_PATH/icon-$variant-$environment-1024-macos.png" -resize x"$highres" -strip "$file_highres"

        optipng -o7 "$file"
        optipng -o7 "$file_highres"
      done

      iconutil -c icns -o "$MACOS_ASSETS_PATH/$variant-$environment.icns" "$TEMP_ICONSET_PATH"

      # Remove temporary `iconset` directory.
      rm -r "$TEMP_ICONSET_PATH";
    fi
  done
done
