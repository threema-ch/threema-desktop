#!/usr/bin/env bash
set -euo pipefail

TEMPLATE=manifest-template.yml
GIT_COMMIT=$(git rev-parse HEAD)
ELECTRON_VERSION=$(node -p "require('../../package.json').devDependencies.electron")

# Parameters: <app-id> <flavor> <app-name>
function generate {
    local app_id=$1
    local flavor=$2
    local app_name=$3
    sed "s/{{app-id}}/$app_id/g" $TEMPLATE \
        | sed "s/{{flavor}}/$flavor/g" \
        | sed "s/{{app-name}}/$app_name/g" \
        | sed "s/{{runtime-version}}/${RUNTIME_VERSION:?}/g" \
        | sed "s/{{git-commit}}/$GIT_COMMIT/g" \
        | sed "s/{{electron-version}}/$ELECTRON_VERSION/g" \
        > "$app_id.yml"
}

# Consumer live
generate 'ch.threema.threema-desktop' 'consumer-live' 'Threema Beta'

# Consumer sandbox
generate 'ch.threema.threema-green-desktop' 'consumer-sandbox' 'Threema Green Beta'

# Work live
generate 'ch.threema.threema-work-desktop' 'work-live' 'Threema Work Beta'

# Work sandbox
generate 'ch.threema.threema-blue-desktop' 'work-sandbox' 'Threema Blue Beta'

# Work onprem
generate 'ch.threema.threema-onprem-desktop' 'work-onprem' 'Threema OnPrem Beta'
