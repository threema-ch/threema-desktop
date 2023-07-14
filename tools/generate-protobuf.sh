#!/usr/bin/env bash
#
# Generate protobuf bindings.
#
# Requires protoc >= 3.15.0 to be installed!
set -euo pipefail

if ! command -v protoc >/dev/null 2>&1; then
    echo "ERROR: Protobuf compiler \"protoc\" not found in your PATH. Please install it manually: https://grpc.io/docs/protoc-installation/"
    exit 1
fi

# Determine script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT="$DIR/.."

# Set the CWD
cd "$ROOT"

# Protocol layer
OUTFILE=src/common/network/protobuf/js/index.js
node_modules/.bin/pbjs \
    threema-protocols/*.proto \
    -o $OUTFILE \
    -t static-module \
    -w es6 \
    --force-long \
    --force-message \
    --no-convert \
    --no-create \
    --no-delimited \
    --no-typeurl \
    --no-verify

# Generate types
node_modules/.bin/pbts \
    $OUTFILE \
    | tools/generate-protobuf-postprocess.cjs \
    | grep -v 'require("long")' \
    > src/common/network/protobuf/js/index.d.ts

# Inject Long global initialization
# TODO(DESK-48): Remove this
{
    head -n 2 $OUTFILE
    echo ""
    echo "// Use LongJS"
    echo "import Long from 'long';"
    echo "\$protobuf.util.Long = Long;"
    echo "\$protobuf.configure();"
    tail -n +3 $OUTFILE
} > $OUTFILE.new
mv $OUTFILE.new $OUTFILE

# Local protobuf modules
TS_PROTO_FILES=(
    './src/common/node/key-storage/key-storage-file.proto'
    './src/common/node/settings/settings.proto'
    './src/common/model/global-property/global-property.proto'
)
protoc \
    --plugin=./node_modules/.bin/protoc-gen-ts_proto \
    --ts_proto_out=. \
    --ts_proto_opt=forceLong=long \
    --ts_proto_opt=esModuleInterop=true \
    --ts_proto_opt=oneof=unions \
    --ts_proto_opt=outputJsonMethods=false \
    --ts_proto_opt=outputPartialMethods=false \
    --ts_proto_opt=constEnums=true \
    --ts_proto_opt=outputClientImpl=false \
    --ts_proto_opt=outputServices=false \
    --ts_proto_opt=env=browser \
    --ts_proto_opt=exportCommonSymbols=false \
    "${TS_PROTO_FILES[@]}"
for file in "${TS_PROTO_FILES[@]}"; do
    prettier --write "${file/.proto/.ts}"
done
