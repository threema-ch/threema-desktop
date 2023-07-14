#!/usr/bin/env bash

function print_usage() {
    echo "Usage: $0 [--rebuild]"
    echo ""
    echo "Options:"
    echo "  --rebuild          Force a Docker image rebuild"
    echo "  -h,--help          Print this help and exit"
}

# Parse arguments
force_rebuild=0
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --rebuild) force_rebuild=1 ;;
        -h|--help) print_usage; return 0 ;;
        --) shift; break ;;
        *) echo "Unknown parameter passed: $1"; print_usage; return 1 ;;
    esac
    shift
done

# Extract necessary vars
NODE_VERSION=$(jq -e -r '.build.args.NODE_VERSION' ./.devcontainer/devcontainer.json)
WORK_DIRECTORY=$(jq -e -r '.workspaceFolder' ./.devcontainer/devcontainer.json)
RUN_ARGS=$(jq -e -r '.runArgs | join(" ") | sub("\\${localEnv:(?<v>[^}]+)}"; env[.v])' ./.devcontainer/devcontainer.json)
MOUNTS=$(jq -e -r '.mounts | map("--mount=\(sub("\\${localEnv:(?<v>[^}]+)}"; env[.v]))") | join(" ")' ./.devcontainer/devcontainer.json)

# Build the Docker container for the current version, if necessary
DOCKER_IMAGE=$(docker images -q "threema-desktop-env:${NODE_VERSION}" 2> /dev/null)
if [[ "$DOCKER_IMAGE" == "" ]] || [[ "$force_rebuild" -eq 1 ]]; then
    docker build \
      --no-cache \
      --build-arg NODE_VERSION="${NODE_VERSION}" \
      ./.devcontainer \
      -t "threema-desktop-env:${NODE_VERSION}"
fi

# Run a command in the container
function run_in_container {
    args="$*"
    bash -ic "
    docker run \
      -it \
      ${RUN_ARGS} \
      ${MOUNTS} \
      --user=$(id -u):$(id -g) \
      --workdir=${WORK_DIRECTORY} \
      --volume=${PWD}:${WORK_DIRECTORY}:rw \
      threema-desktop-env:${NODE_VERSION} \
      /bin/bash -ic \"${args}\"
    "
}

# Alias `node` and `npm`
function npm {
    run_in_container npm "$@"
}
function node {
    run_in_container node "$@"
}

# Add prompt prefix
if [[ "$PS1" != "[dev]"* ]]; then
    export PS1="[dev]$PS1"
fi

# Announce
echo "npm and node commands are now run inside threema-desktop-env:${NODE_VERSION}"
