# Generated Code

## Protobuf Files

To update the protobuf files, ensure you have cloned the repository recursively
(`git clone --recursive ...`). Then, simply checkout the desired tag via git in the
`threema-protocols` directory.

Generating the static protobuf modules can be done in the following way:

    npm run protobuf:generate

Note that `protoc`, the Protobuf compiler, needs to be installed in your system. If you need to
install it, check the [official documentation](https://grpc.io/docs/protoc-installation/).

## Structbuf Files

To update the structbuf files, ensure you have cloned the repository recursively
(`git clone --recursive ...`). Then, simply checkout the desired tag via git in the
`threema-protocols` directory.

Generating the static structbuf modules can be done in the following way:

    npm run structbuf:generate
