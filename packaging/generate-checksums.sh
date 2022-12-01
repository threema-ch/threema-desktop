#!/usr/bin/env bash
#
# Generate SHA256 and Blake2b checksums of the specified filepath.
# Note that the directory will be stripped from the file path contained in the checksum file.
set -euo pipefail

dir="$(dirname "$1")"
file="$(basename "$1")"

cd "$dir"
sha256sum "$file" > "$file.sha256"
b2sum "$file" > "$file.b2"
