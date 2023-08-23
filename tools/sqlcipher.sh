#!/bin/bash
#
# Open the SQLite database in the user profile.
set -euo pipefail

function print_usage() {
    echo "Usage: $0 --profile <path-to-desktop-profile-directory>"
    echo ""
    echo "Options:"
    echo "  --profile            Path to the desktop profile directory"
    echo "  -h,--help            Print this help and exit"
}

# If no arguments are passed, print usage
if [ "$#" -lt 1 ]; then print_usage; exit 1; fi

# Parse arguments
profiledir=''
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --profile) profiledir="$2"; shift ;;
        -h|--help) print_usage; exit 0 ;;
        *) echo "Unknown parameter passed: $1"; print_usage; exit 1 ;;
    esac
    shift
done

# Determine database path
dbpath="$profiledir/data/threema.sqlite"
if [[ -f "$dbpath" ]]; then
    echo -e "Opening database at $dbpath\n"
else
    echo "Error: File at $dbpath does not exist"
    exit 1
fi

# Get password
read -r -p "Password (hex): " password
echo "Note: If you're getting \"file is not a database\" warnings below, your password is probably wrong"
echo ""

sqlcipher \
    -cmd "PRAGMA cipher_compatibility = 4" \
    -cmd "PRAGMA key = \"x'$password'\"" \
    -cmd "PRAGMA temp_store = MEMORY" \
    -cmd "PRAGMA journal_mode = WAL" \
    "$dbpath"
