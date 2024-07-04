import * as v from '@badrap/valita';

import type {StatusMessageType} from '~/common/enum';
import * as protobuf from '~/common/internal-protobuf/status-message';
import type {StatusMessagesCodec} from '~/common/status';

const CHAT_RESTORED_SCHEMA = v.object({}).rest(v.unknown());

export const CHAT_RESTORED_CODEC: StatusMessagesCodec<StatusMessageType.CHAT_RESTORED> = {
    encode: (status) => protobuf.ChatRestored.encode(status).finish(),
    decode: (encoded) =>
        CHAT_RESTORED_SCHEMA.parse(protobuf.ChatRestored.decode(encoded as Uint8Array)),
} as const;
