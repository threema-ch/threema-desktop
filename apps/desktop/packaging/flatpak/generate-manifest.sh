#!/usr/bin/env bash
set -euo pipefail

TEMPLATE=manifest-template.yml
GIT_COMMIT=$(git rev-parse HEAD)
ELECTRON_VERSION=$(node -p "require('../../package.json').devDependencies.electron")

GITHUB_URL=https://github.com/threema-ch/threema-desktop.git

# Parameters: <app-id> <flavor> <app-name> [<tag>]
#
# If FLATHUB_DEPLOYMENT is set, the project source is fetched from GitHub at the given <tag> instead
# of from the local repository path.
app_id=$1
flavor=$2
app_name=$3

sed "s/{{app-id}}/$app_id/g" $TEMPLATE \
    | sed "s/{{flavor}}/$flavor/g" \
    | sed "s/{{app-name}}/$app_name/g" \
    | sed "s/{{runtime-version}}/${RUNTIME_VERSION:?}/g" \
    | sed "s/{{git-commit}}/$GIT_COMMIT/g" \
    | sed "s/{{electron-version}}/$ELECTRON_VERSION/g" \
    > "$app_id.yml"

if [[ -n "${FLATHUB_DEPLOYMENT:-}" ]]; then
    tag=${4:?A tag must be provided as the fourth argument when FLATHUB_DEPLOYMENT is set}
    sed -i \
        -e "s|path: ../../../..|url: $GITHUB_URL|" \
        -e "/commit: '$GIT_COMMIT'/a\        tag: $tag" \
        "$app_id.yml"
fi

