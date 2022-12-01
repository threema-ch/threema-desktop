#!/usr/bin/env bash

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Process PlantUML files
for f in "$DIR"/*.pu; do
    echo "Processing $f"
    plantuml -tsvg "$f"
done
