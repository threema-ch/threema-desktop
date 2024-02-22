#!/usr/bin/env bash
set -euo pipefail

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$DIR/.."

# Set the CWD
cd "$ROOT"

# This script needs `imagemagick` (to be able to use the `convert` command), so check first if it's
# available.
if ! command -v convert -version &> /dev/null; then
    echo "Command \"convert\" could not be found! Is \"ImageMagick\" installed?"
    exit
fi

# This script needs the `icotool` utility to be installed. On Arch, it's included in the `icoutils`
# package.
if ! command -v icotool &> /dev/null; then
    echo "Command \"icotool\" could not be found! Is it installed?"
    exit
fi

if ! command -v optipng &> /dev/null; then
    echo "Command \"optipng\" could not be found! Is it installed?"
    exit
fi

#
# Generate ICO bundles
#

BASE_ASSETS_PATH="packaging/assets/icons/base"
WIN_ASSETS_PATH="packaging/assets/icons/win"

echo "Starting ICO build"

declare -a variants=("consumer" "work")
declare -a environments=("live" "sandbox")
declare -a sizes=(16 32 64 128 256)

for variant in "${variants[@]}"; do
  for environment in "${environments[@]}"; do
    echo "Building \"$variant-$environment\""
    
    TEMP_PATH="$WIN_ASSETS_PATH/$variant-$environment"
    mkdir -p "$TEMP_PATH";

    # Build various sizes and write them to the temporary asset directory.
    files=()
    for size in "${sizes[@]}"; do
      file="$TEMP_PATH/icon_${size}x${size}.png"
      convert "$BASE_ASSETS_PATH/icon-$variant-$environment-1024.png" -resize x"$size" -strip "$file"
      optipng -o7 "$file"
      files+=("$file")
    done

    # Convert each set of icons to an `ico` package.
    icotool -c -o "$WIN_ASSETS_PATH/$variant-$environment.ico" "${files[@]}"

    # Remove temporary directory.
    rm -r "$TEMP_PATH";
  done
done

#
# Generate MSIX icon sets
#

BASE_ASSETS_PATH="packaging/assets/icons/base"
ASSETS_PATH="src/public/res/icons/msix"

echo "Starting MSIX icon set build"

declare -a variants=("consumer" "work")
declare -a environments=("live" "sandbox" "onprem")

for variant in "${variants[@]}"; do
  for environment in "${environments[@]}"; do
    # Generate assets for every combination, except "consumer-onprem" (which doesn't exist).
    if ! [[ "$variant" == "consumer" && "$environment" == "onprem" ]]; then
      echo "Building \"$variant-$environment\""

      OUTPUT_PATH="$ASSETS_PATH/$variant-$environment"
      mkdir -p "$OUTPUT_PATH";

      # 1. Generate `Square44x44Logo.png` variants.

      # Generate base file.
      file="$OUTPUT_PATH/Square44x44Logo.png"
      convert "$BASE_ASSETS_PATH/icon-$variant-$environment-1024.png" -resize x44 -strip "$file"
      optipng -o7 "$file"

      declare -a themes=("altform-unplated" "altform-lightunplated")
      declare -a sizes=(16 20 24 30 32 36 40 44 48 60 64 72 80 96 256)

      # Build alternative sizes and write them to the target asset directory.
      for size in "${sizes[@]}"; do
        file="$OUTPUT_PATH/Square44x44Logo.targetsize-${size}.png"
        convert "$BASE_ASSETS_PATH/icon-$variant-$environment-1024.png" -resize x"$size" -strip "$file"
        optipng -o7 "$file"

        for theme in "${themes[@]}"; do
          file="$OUTPUT_PATH/Square44x44Logo.targetsize-${size}_${theme}.png"
          convert "$BASE_ASSETS_PATH/icon-$variant-$environment-1024.png" -resize x"$size" -strip "$file"
          optipng -o7 "$file"
        done
      done

      # 2. Generate `Square150x150Logo.png` variant.

      file="$OUTPUT_PATH/Square150x150Logo.png"
      convert "$BASE_ASSETS_PATH/icon-$variant-$environment-1024.png" -resize x150 -strip "$file"
      optipng -o7 "$file"

      # 3. Generate store logo.

      file="$OUTPUT_PATH/StoreLogo.png"
      convert "$BASE_ASSETS_PATH/icon-$variant-$environment-1024-square.png" -resize x150 -strip "$file"
      optipng -o7 "$file"
    fi
  done
done
