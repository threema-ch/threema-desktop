/**
 * These helpers now live in `@threema/protocol`, next to the generated bindings they are anchored
 * to. This module is kept as a re-export so that the `~/common/network/protobuf` namespace stays
 * intact for existing call sites.
 */
// TODO(DESK-2248): Remove re-exports in favor of updating the changed imports.
export {
    byteEncoder,
    creator,
    creatorForMap,
    encoder,
    validator,
    type ProtobufArrayInstanceOf,
    type ProtobufConstructor,
    type ProtobufInstanceOf,
    type ProtobufMapInstanceOf,
} from '@threema/protocol/protobuf/utils';
