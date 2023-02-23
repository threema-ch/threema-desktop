#!/usr/bin/env bash
#
# Run a command and retry it if it fails with a certain type of error.
# This is helpful to avoid spurious CI failures due to connection errors (or similar).
set -euo pipefail

GREP_PATTERN_NPM="connect ETIMEDOUT"
GREP_PATTERN_EOF="SyntaxError: unexpected EOF while parsing"
GREP_PATTERN_ABORTED="ReadError: The server aborted pending request"

function print_usage() {
    echo "Usage: $0 --retries <retries> --delay <delay> [-- ...]"
    echo ""
    echo "Everything after -- is being executed."
    echo ""
    echo "Options:"
    echo "  --retries          Number of retries until giving up"
    echo "  --delay            Delay in seconds between attempts"
    echo "  -h,--help          Print this help and exit"
}

# If no arguments are passed, print usage
if [ "$#" -lt 1 ]; then print_usage; exit 1; fi

# Parse arguments
retries=''
delay=''
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --retries) retries="$2"; shift ;;
        --delay) delay="$2"; shift ;;
        -h|--help) print_usage; exit 0 ;;
        --) shift; break ;;
        *) echo "Unknown parameter passed: $1"; print_usage; exit 1 ;;
    esac
    shift
done
if [ "$retries" = "" ]; then echo "Error: Missing --retries argument"; echo ""; print_usage; exit 1; fi
if [ "$delay" = "" ]; then echo "Error: Missing --delay argument"; echo ""; print_usage; exit 1; fi
if [ "$*" = "" ]; then echo "Error: Missing command"; echo ""; print_usage; exit 2; fi

# Run npm ci
TMPFILE=.run-with-retry.tmp
for attempt in $(seq "$retries"); do
    if [ "$attempt" -gt 1 ]; then echo ""; fi
    echo "==> Attempt $attempt: \`$*\`"
    exitcode=0
    2>&1 $* | tee $TMPFILE || exitcode=$?
    if [ "$exitcode" -eq 0 ]; then
        echo "==> Command succeeded"
        exit 0
    else
        echo "==> Command failed with exit code $exitcode"
        if [ "$attempt" -lt "$retries" ]; then
            npm_timeout=$(grep -c "$GREP_PATTERN_NPM" $TMPFILE || true)
            npm_eof=$(grep -c "$GREP_PATTERN_EOF" $TMPFILE || true)
            npm_aborted=$(grep -c "$GREP_PATTERN_ABORTED" $TMPFILE || true)
            if [ "$npm_timeout" -gt 0 ]; then
                echo "==> Detected npm timeout."
            elif [ "$npm_eof" -gt 0 ]; then
                echo "==> Detected npm parsing EOF."
            elif [ "$npm_aborted" -gt 0 ]; then
                echo "==> Detected npm server connection abort."
            else
                echo "==> No known error detected. Aborting."
                exit 3
            fi
            echo "==> Retrying in $delay s."
            sleep "$delay"
        fi
    fi
done
