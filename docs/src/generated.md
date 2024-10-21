# Generated Code

## Protobuf Files

Generating the static protobuf modules can be done in the following way:

    npm run protobuf:generate <path-to-threema-protocols-directory>

Note that `protoc`, the Protobuf compiler, needs to be installed in your system. If you need to
install it, check the [official documentation](https://grpc.io/docs/protoc-installation/).

## Structbuf Files

Generating the static structbuf modules can be done in the following way:

    npm run structbuf:generate <path-to-structbuf-typescript-bin.js> <path-to-threema-protocols-directory>
