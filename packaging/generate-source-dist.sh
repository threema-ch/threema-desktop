#!/usr/bin/env bash
#
# Export the source code for publication.
#
# Requirements:
#
# - git >= 2.25
# - tar
# - gzip
# - p7zip
# - coreutils

set -euo pipefail

GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

function print_usage() {
    echo "Usage: $0 [-h] [-v VERSION]"
    echo ""
    echo "Options:"
    echo "  -h,--help        Print this help and exit"
    echo "  -v VERSION       Version to use in filename (default: extract from package.json)"
}

function log() {
    echo -en "$1"
    echo -n "$2 $3"
    echo -e "$RESET"
}

function log_major() { log "$GREEN" "==>" "$1"; }
function log_minor() { log "$GREEN" "--> " "$1"; }
function log_warning() { log "$YELLOW" "--> " "$1"; }
function log_error() { log "$RED" "!!!" "Error: $1"; }

function fail() {
    log_error "$1"
    exit 1
}

# Re-implementation of realpath function (hello macOS)
function realpath() {
    OURPWD=$PWD
    cd "$(dirname "$1")"
    LINK=$(readlink "$(basename "$1")")
    while [ "$LINK" ]; do
        cd "$(dirname "$LINK")"
        LINK=$(readlink "$(basename "$1")")
    done
    REALPATH="$PWD/$(basename "$1")"
    cd "$OURPWD"
    echo "$REALPATH"
}

# Parse arguments
version=""
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -v) version="$2"; shift ;;
        -h|--help) print_usage; exit 0 ;;
        *) echo "Unknown parameter passed: $1"; print_usage; exit 1 ;;
    esac
    shift
done


# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
REPO_ROOT="$(realpath "$DIR"/..)"

# Change into root directory
cd "$REPO_ROOT"

# Ensure that temporary directory does not yet exist
build_dir=$(realpath "$REPO_ROOT"/build/tmp/)
tmp_dir="$build_dir/clone"
if [ -d "$build_dir" ]; then
    echo  "Removing temporary build directory ${build_dir}"
    rm -r "$build_dir"
fi
mkdir "$build_dir"

# Shallow clone
branch=$(git rev-parse --abbrev-ref HEAD)
log_major "Cloning repository (branch $branch)"
git clone -c protocol.file.allow=always --depth 1 "file://$REPO_ROOT" "$tmp_dir"

# Rewrite submodule paths and check out submodules
log_major "Rewrite and check out submodules"
cd "$tmp_dir"
grep path .gitmodules | sed 's/.*path = //' | while IFS= read -r path; do
    git submodule set-url "$path" "../../$path"
done
git -c protocol.file.allow=always submodule update --init --recursive

# Remove some files
cd "$tmp_dir"
log_major "Removing files not needed for source distribution"
log_minor "Git history"
find . -depth -name .git -exec rm -rf "{}" \;
find . -name .gitmodules -type f -delete
find . -name .gitignore -type f -delete
find . -name .gitattributes -type f -delete
log_minor "CI config"
find . -name '.gitlab-ci*' -type f -delete
find . -name '.travis.yml' -type f -delete
find . -name 'appveyor.yml' -type f -delete
find . -depth -name '.github' -type d -exec rm -rf "{}" \;
find . -depth -name '.gitlab' -type d -exec rm -rf "{}" \;
log_minor "Development"
find . -depth -name .vscode -type d -exec rm -rf "{}" \;
find . -depth -name .devcontainer -type d -exec rm -rf "{}" \;
find . -depth -name .eslintrc.cjs -type f -delete
find . -depth -name .eslintignore -type f -delete
find . -depth -name .prettierrc.yml -type f -delete
find . -depth -name .prettierignore -type f -delete
find . -depth -name .editorconfig -type f -delete
rm -f .git-pre-commit.sh
log_minor "Third party documentation"
find libs/node-argon2/ -depth -name latex -type d -exec rm -rf "{}" \;
find libs/node-argon2/ -name '*.pdf' -type f -delete

# Helper function: Generate checksums
function generate_checksums() {
    bash "$DIR"/generate-checksums.sh "$1"
}

is_7z_available=false
if which 7zr 1>/dev/null 2>&1; then
    is_7z_available=true
fi

# Package
cd "$tmp_dir"
log_major "Package code into archive"
if [ -z $version ]; then
    version=$(grep '"version"' package.json | head -n 1 | sed 's/.*"\([^"]*\)",$/\1/')
fi
cd "$build_dir"
dest_dir="threema-desktop-$version"
if [ -d "$dest_dir" ]; then
    fail "Directory $dest_dir already exists"
fi
mv "$tmp_dir" "$dest_dir"
archive_prefix="threema-desktop-$version-source"
log_minor "tar.gz"
tar -cf - "$dest_dir" | gzip -9 > "$archive_prefix.tar.gz"
if $is_7z_available; then
    log_minor "7z"
    7zr a -mx9 "$archive_prefix.7z" "$dest_dir"
else
    log_warning "skipping 7z package as '7zr' binary is not available"
fi

# Generate and verify checksums
log_major "Checksums"
log_minor "Generate"
generate_checksums "$archive_prefix.tar.gz"
if $is_7z_available; then
    generate_checksums "$archive_prefix.7z"
fi
log_minor "Verify sha256sum"
sha256sum -c ./*.sha256
log_minor "Verify b2sum"
b2sum -c ./*.b2

# Move files
out_dir=$(realpath "$REPO_ROOT"/build/out/)
mkdir -p "$out_dir"
mv "$archive_prefix"* "$out_dir/"

log_major "Done! The source code can be found in the 'build/out/' directory."
