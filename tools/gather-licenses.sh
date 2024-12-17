#!/usr/bin/env bash

set -euo pipefail

LICENSE_FILES=(
    'argon2' 'node_modules/argon2/LICENSE'
    'autolinker' 'node_modules/autolinker/LICENSE'
    'better-sqlite' 'node_modules/better-sqlcipher/LICENSE'
    'electron' 'node_modules/electron/LICENSE'
    'emojibase-data' 'node_modules/emojibase-data/LICENSE'
    'fast-sha256' 'node_modules/fast-sha256/LICENSE'
    'i18next' 'node_modules/i18next/LICENSE'
    'intl-messageformat' 'node_modules/intl-messageformat/LICENSE.md'
    'long' 'node_modules/long/LICENSE'
    'protobufjs' 'node_modules/protobufjs/LICENSE'
    'qrcode' 'node_modules/qrcode/license'
    'scrypt-js' 'node_modules/scrypt-js/LICENSE.txt'
    'sqlcipher' '.licenses/sqlcipher'
    'svelte' 'node_modules/svelte/LICENSE.md'
    'synchronous-promise' 'node_modules/synchronous-promise/LICENSE'
    'ts-events' 'node_modules/ts-events/LICENSE'
    'ts-sql-query' 'node_modules/ts-sql-query/LICENSE.md'
    'tweetnacl' 'node_modules/tweetnacl/LICENSE'
    'twemoji' '.licenses/twemoji'
    'valita' 'node_modules/@badrap/valita/LICENSE'
    'web-streams-adapter' 'node_modules/@mattiasbuelens/web-streams-adapter/LICENSE.md'
)
FILE=LICENSE-3RD-PARTY.txt

echo -e "Licenses for third party libraries in Threema for Desktop:\n\n\n\n" > $FILE
for i in ${!LICENSE_FILES[@]}; do
    if (( $i % 2 == 0 )); then
        echo -e "----------" >> $FILE
        echo -e "License for ${LICENSE_FILES[$i]}" >> $FILE
        echo -e "----------\n" >> $FILE
    else
        cat "${LICENSE_FILES[$i]}" >> $FILE
        echo -e "\n\n\n" >> $FILE
    fi
done
