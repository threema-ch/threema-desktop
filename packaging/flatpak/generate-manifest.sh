#!/usr/bin/env bash
set -euo pipefail

TEMPLATE=manifest-template.yml

# Parameters: <app-id> <flavor> <app-name>
function generate {
    local app_id=$1
    local flavor=$2
    local app_name=$3
    sed "s/{{app-id}}/$app_id/g" $TEMPLATE \
        | sed "s/{{flavor}}/$flavor/g" \
        | sed "s/{{app-name}}/$app_name/g" \
        > "$app_id.yml"
}

# Consumer live
generate 'ch.threema.threema-desktop' 'consumer-live' 'Threema Beta'

# Work sandbox
generate 'ch.threema.threema-blue-desktop' 'work-sandbox' 'Threema Blue Beta'

# Work live
generate 'ch.threema.threema-work-desktop' 'work-live' 'Threema Work Beta'

# Work onprem
generate 'ch.threema.threema-onprem-desktop' 'work-onprem' 'Threema OnPrem Beta'
