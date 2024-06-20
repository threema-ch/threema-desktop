import type {StatusMessageType} from '~/common/enum';
import * as protobuf from '~/common/internal-protobuf/status-message';
import type {StatusMessagesCodec} from '~/common/status';

export const GROUP_NAME_CHANGED_CODEC: StatusMessagesCodec<StatusMessageType.GROUP_NAME_CHANGED> = {
    encode: (status) => protobuf.GroupNameChanged.encode(status).finish(),
    decode: (encoded) => protobuf.GroupNameChanged.decode(encoded as Uint8Array),
} as const;
