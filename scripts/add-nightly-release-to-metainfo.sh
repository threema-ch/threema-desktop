#!/usr/bin/env bash
#
# Insert a nightly release entry into an AppStream metainfo file (in place).
#
# The base version is read from the metainfo file itself, because per the AppStream spec its first
# `<release>` entry is the current version. It is deliberately not read from `package.json`, which
# uses a different version scheme (e.g. `2.0-beta66` instead of `2.0~publicbeta66`).
#
# The new entry is inserted above the current one, which makes it the current version for nightly
# builds, so that software centers can tell them apart from the last stable release.
set -euo pipefail

function print_usage() {
    echo "Usage: $0 <metainfo-file> [--revision <revision>] [--date <date>]"
    echo ""
    echo "Arguments:"
    echo "  <metainfo-file>    Path to the AppStream metainfo file to patch"
    echo ""
    echo "Options:"
    echo "  --revision         Revision to tag the entry with. Defaults to the short git revision"
    echo "                     of HEAD."
    echo "  --date             Release date (YYYY-MM-DD). Used both as the release date and, in"
    echo "                     condensed form, as part of the version. Defaults to today."
    echo "  -h,--help          Print this help and exit"
}

# If no arguments are passed, print usage
if [ "$#" -lt 1 ]; then print_usage; exit 1; fi

# Parse arguments
metainfo=''
revision=''
date=''
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --revision) revision="$2"; shift ;;
        --date) date="$2"; shift ;;
        -h|--help) print_usage; exit 0 ;;
        -*) echo "Unknown parameter passed: $1"; echo ""; print_usage; exit 1 ;;
        *)
            if [ "$metainfo" != "" ]; then
                echo "Error: Unexpected argument: $1"; echo ""; print_usage; exit 1
            fi
            metainfo="$1"
            ;;
    esac
    shift
done
if [ "$metainfo" = "" ]; then echo "Error: Missing <metainfo-file> argument"; echo ""; print_usage; exit 1; fi
if [ ! -f "$metainfo" ]; then echo "Error: File not found: $metainfo"; exit 1; fi
if [ "$date" = "" ]; then date="$(date +%Y-%m-%d)"; fi
if ! [[ "$date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo "Error: Invalid date, expected YYYY-MM-DD: $date"
    exit 1
fi
if [ "$revision" = "" ]; then revision="$(git rev-parse --short HEAD)"; fi

# Locate the current release entry, i.e. the first one in the file.
current=$(grep -n -m1 '<release version="' "$metainfo") || {
    echo "Error: Found no release entry in $metainfo"
    exit 1
}

# Split the match (e.g. `48:        <release version="2.0~publicbeta66" ...`) into the line number,
# the indentation and the version.
line=${current%%:*}
indent=${current#*:}
indent=${indent%%<*}
version=$(cut -d'"' -f2 <<< "$current")

# Insert the nightly entry right above the current one.
nightly_version="$version-dev-${date//-/}-$revision"
sed -i "${line}i\\${indent}<release version=\"$nightly_version\" date=\"$date\" />" "$metainfo"
echo "Patched $metainfo with release entry for $nightly_version"
