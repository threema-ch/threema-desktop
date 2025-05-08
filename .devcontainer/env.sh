#!/usr/bin/env bash

# Environment configuration

# Set to the most recent stable Debian version
_DEBIAN_VERSION="12"

# Extract from `package.json`
_NODE_VERSION=$(jq -e -r '.engines.node' package.json)

# Extract from `src/launcher/rust-toolchain.toml`
_RUST_VERSION=$(sed -n 's/.*channel = "\([^"]*\)".*/\1/p' ./src/rust/common/rust-toolchain.toml)

# Set to the most recent binaryen release
_BINARYEN_VERSION="121"

# Commands to run inside the Docker container
#
# Note: `npm` is treated specially
_COMMANDS=("cargo" "rustc" "rustdoc" "rustfmt" "rustup" "node" "wasm-bindgen" "wasm-opt")

# ---

function _print_usage() {
    echo "Usage: $0 [--rebuild] [--build-only]"
    echo ""
    echo "Options:"
    echo "  --rebuild          Force a Docker image rebuild"
    echo "  --build-only       Only build the Docker image but don't start the environment"
    echo "  -h,--help          Print this help and exit"
}

# Parse arguments
_force_rebuild=0
_build_only=0
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h | --help)
             _print_usage
             return 0
             ;;
        --rebuild)
            _force_rebuild=1
            ;;
        --build-only)
            _build_only=1
            ;;
        --)
            shift;
            break
            ;;
        *)
            echo "Unknown parameter passed: $1";
            _print_usage;
            return 1
            ;;
    esac
    shift
done

# Determine Docker image name
_image_name="threema-desktop-env:debian-${_DEBIAN_VERSION}-node-${_NODE_VERSION}-rust-${_RUST_VERSION}-binaryen-${_BINARYEN_VERSION}"

# Update the `devcontainer.json` with the correct Docker image name, if necessary
if [[ "$(jq -e -r '.image' ./.devcontainer/devcontainer.json)" != "${_image_name}" ]]; then
    _json_content="$(jq --arg name "${_image_name}" '.image = $name' ./.devcontainer/devcontainer.json)"
    echo "${_json_content}" > ./.devcontainer/devcontainer.json
    unset -v _json_content
    npx prettier --write "./.devcontainer/devcontainer.json" > /dev/null
fi

# Build the Docker container, if necessary
if [[ "$(docker images -q ${_image_name} 2> /dev/null)" == "" ]] || [[ "$_force_rebuild" -eq 1 ]]; then
    docker build \
    --no-cache \
    --build-arg USER_UID=$(id -u) \
    --build-arg USER_GID=$(id -g) \
    --build-arg DEBIAN_VERSION="${_DEBIAN_VERSION}" \
    --build-arg NODE_VERSION="${_NODE_VERSION}" \
    --build-arg RUST_VERSION="${_RUST_VERSION}" \
    --build-arg BINARYEN_VERSION="${_BINARYEN_VERSION}" \
    ./.devcontainer \
    -t ${_image_name}
fi
if [[ "$_build_only" -eq 1 ]]; then
    exit 0
fi

# Run the Docker container in the background, if necessary
_work_directory=$(jq -e -r '.workspaceFolder' ./.devcontainer/devcontainer.json)
_run_args=$(jq -e -r '.runArgs | join(" ") | sub("\\${localEnv:(?<v>[^}]+)}"; env[.v])' ./.devcontainer/devcontainer.json)
_mounts=$(jq -e -r '.mounts | map("--mount=\(sub("\\${localEnv:(?<v>[^}]+)}"; env[.v]))") | join(" ")' ./.devcontainer/devcontainer.json)
_docker_run_name=${_image_name//[:]/-}
_docker_container_running=$(docker ps -q --filter name=${_docker_run_name} 2> /dev/null)
if [[ "$_docker_container_running" == "" ]] || [[ "$_force_rebuild" -eq 1 ]]; then
    docker rm -f ${_docker_run_name} &> /dev/null
    docker run \
        -dit \
        --rm \
        --name ${_docker_run_name} \
        ${_run_args} \
        ${_mounts} \
        --user=$(id -u):$(id -g) \
        --workdir=${_work_directory} \
        --volume=${PWD}:${_work_directory}:rw \
        ${_image_name} \
        > /dev/null
fi

# Clean up
unset -v _DEBIAN_VERSION _NODE_VERSION _RUST_VERSION _BINARYEN_VERSION
unset -v _print_usage _force_rebuild _build_only
unset -v _image_name
unset -v _work_directory _run_args _mounts

# Run a command in the container
function _run_in_container {
    args="$*"
    bash -ic "
    docker exec \
      -it \
      ${_docker_run_name} \
      /bin/bash -ic \"${args}\"
    "
}

# Command overrides
for _command in "${_COMMANDS[@]}"; do
    eval "function ${_command}() { _run_in_container ${_command} \"\$@\"; }"
done

# npm commands
function npm {
    if [[ "$1" != "run" ]]; then
        _run_in_container npm "$@"
        return 0
    fi
    case $2 in
        assets:generate:icons:macos | assets:generate:icons:windows | dev:* | generate-screenshots | libthreema:include | test:karma | test:playwright:*)
            command npm "$@"
            ;;
        package)
            if [[ "$3" == "dmg" ]]; then
                command npm "$@"
            else
                _run_in_container npm "$@"
            fi
            ;;
        *)
            _run_in_container npm "$@"
            ;;
    esac
}

# Run an interactive shell in the container
function enter {
    bash -ic "
    docker exec \
      -it \
      ${_docker_run_name} \
      /bin/bash
    "
}

# Stop the container and remove all variables and functions
function deactivate {
    if [[ "${1-}" != "--only-if-started" ]] || [[ "$_docker_container_running" == "" ]]; then
        docker rm -f ${_docker_run_name} &> /dev/null
    fi
    unset -v _docker_run_name _docker_container_running
    unset -f _run_in_container
    unset -f "${_COMMANDS[@]}" npm
    unset -f enter
    unset -f deactivate
    unset -v _COMMANDS
}

# Announce
echo "The following commands are now run inside the container: ${_COMMANDS[@]}"
echo "Enter the container by calling 'enter'"
echo "Stop the container and deactivate all command overrides by calling 'deactivate'"
