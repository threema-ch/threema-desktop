#!/usr/bin/env bash
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
node_modules/.bin/pbjs \
    threema-protocols/*.proto \
    -o src/common/network/protobuf/js/index.js \
    -t static-module \
    -w es6 \
    --force-long \
    --force-message \
    --no-convert \
    --no-create \
    --no-delimited \
    --no-verify

# Generate types
node_modules/.bin/pbts \
    src/common/network/protobuf/js/index.js \
    | tools/generate-protobuf-postprocess.cjs \
    > src/common/network/protobuf/js/index.d.ts

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
    --experimental_allow_proto3_optional \
    "${TS_PROTO_FILES[@]}"
for file in "${TS_PROTO_FILES[@]}"; do
    prettier --write "${file/.proto/.ts}"
done
