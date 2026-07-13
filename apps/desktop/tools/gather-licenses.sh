#!/usr/bin/env bash
#
# Regenerate `LICENSE-3RD-PARTY.txt` in the repository root, which bundles the licenses of all third
# party libraries shipped with Threema for Desktop.

set -euo pipefail

# Resolve all paths from the location of this script, so that it can be run from any working
# directory.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(cd "$DESKTOP_DIR/../.." && pwd)"

# License file paths below are resolved relative to the monorepo root.
LICENSE_FILES=(
    'argon2' 'apps/desktop/node_modules/argon2/LICENSE'
    'autolinker' 'apps/desktop/node_modules/autolinker/LICENSE'
    'better-sqlite' 'apps/desktop/node_modules/better-sqlcipher/LICENSE'
    'electron' 'apps/desktop/node_modules/electron/LICENSE'
    'emojibase-data' 'apps/desktop/node_modules/emojibase-data/LICENSE'
    'fast-sha256' 'apps/desktop/node_modules/fast-sha256/LICENSE'
    'i18next' 'apps/desktop/node_modules/i18next/LICENSE'
    'intl-messageformat' 'apps/desktop/node_modules/intl-messageformat/LICENSE.md'
    'long' 'apps/desktop/node_modules/long/LICENSE'
    'Material Design Icons' '.licenses/material-design-icons'
    'Mediabunny' 'apps/desktop/node_modules/mediabunny/LICENSE'
    'Open Sans' '.licenses/opensans'
    'protobufjs' 'apps/desktop/node_modules/protobufjs/LICENSE'
    'qrcode' 'apps/desktop/node_modules/qrcode/license'
    'rtcstats' 'apps/desktop/node_modules/@rtcstats/rtcstats-js/LICENSE.md'
    'scrypt-js' 'apps/desktop/node_modules/scrypt-js/LICENSE.txt'
    'sqlcipher' '.licenses/sqlcipher'
    'svelte' 'apps/desktop/node_modules/svelte/LICENSE.md'
    'synchronous-promise' 'apps/desktop/node_modules/synchronous-promise/LICENSE'
    'ts-events' 'apps/desktop/node_modules/ts-events/LICENSE'
    'ts-sql-query' 'apps/desktop/node_modules/ts-sql-query/LICENSE.md'
    'tweetnacl' 'apps/desktop/node_modules/tweetnacl/LICENSE'
    'twemoji' '.licenses/twemoji'
    'valita' 'apps/desktop/node_modules/@badrap/valita/LICENSE'
    'web-streams-adapter' 'apps/desktop/node_modules/@mattiasbuelens/web-streams-adapter/LICENSE.md'
)
FILE="$REPO_ROOT/LICENSE-3RD-PARTY.txt"

# Verify that all license files exist before writing anything, and report every missing file.
MISSING=()
for i in "${!LICENSE_FILES[@]}"; do
    if (( i % 2 == 1 )) && [[ ! -f "$REPO_ROOT/${LICENSE_FILES[$i]}" ]]; then
        MISSING+=("${LICENSE_FILES[$((i - 1))]} (${LICENSE_FILES[$i]})")
    fi
done
if (( ${#MISSING[@]} > 0 )); then
    echo "Error: The following license files were not found (dependencies not installed?):" >&2
    printf '  - %s\n' "${MISSING[@]}" >&2
    exit 1
fi

# Note: Some libraries ship their license with CRLF line endings, so normalise them to LF to keep
# the generated file stable regardless of the platform it was generated on.
{
    echo -e "Licenses for third party libraries in Threema for Desktop:\n\n\n\n"
    for i in "${!LICENSE_FILES[@]}"; do
        if (( i % 2 == 0 )); then
            echo -e "----------"
            echo -e "License for ${LICENSE_FILES[$i]}"
            echo -e "----------\n"
        else
            tr -d '\r' < "$REPO_ROOT/${LICENSE_FILES[$i]}"
            echo -e "\n\n\n"
        fi
    done
} > "$FILE"

echo "Wrote $FILE"
