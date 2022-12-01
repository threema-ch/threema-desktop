#!/usr/bin/env bash
set -euo pipefail

FILES=$(git diff --cached --name-only --diff-filter=ACMR "*.md" "*.css" "*.html" "*.js" "*.json" "*.md" "*.scss" "*.svelte" "*.ts" "*.yml" | sed 's| |\\ |g')
echo "${FILES}" | while read -r FILE; do
    if [[ -z "$FILE" ]]; then
        continue
    fi
    echo "$FILE"

    # Prettify
    if [[ $FILE =~ \.(css|html|js|json|md|scss|svelte|ts|yml)$ ]]; then
        echo 'Running prettier'
        ./node_modules/.bin/prettier --check "${FILE}"
    fi
done

