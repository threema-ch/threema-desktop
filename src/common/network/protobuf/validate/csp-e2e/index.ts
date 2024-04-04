import type {CspE2eGroupMessageUpdateType, CspE2eMessageUpdateType} from '~/common/enum';
import type {CspE2eType} from '~/common/network/protocol';
import type {GroupMemberContainer} from '~/common/network/structbuf/validate/csp/e2e';

import type * as DeleteMessage from './delete-message';
import type * as EditMessage from './edit-message';

export * as MessageMetadata from './message-metadata';
export * as DeleteMessage from './delete-message';
export * as EditMessage from './edit-message';

/**
 * A validated message with its payload type.
 */
interface ValidatedCspE2eMessageType<T extends CspE2eType, P> {
    type: T;
    message: P;
}

/**
 * All possible validated message types.
 */
export type ValidatedCspE2eTypesProtobuf =
    // Message updates
    | ValidatedCspE2eMessageType<CspE2eMessageUpdateType.EDIT_MESSAGE, EditMessage.Type>
    | ValidatedCspE2eMessageType<
          CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE,
          GroupMemberContainer.Type
      >
    | ValidatedCspE2eMessageType<CspE2eMessageUpdateType.DELETE_MESSAGE, DeleteMessage.Type>
    | ValidatedCspE2eMessageType<
          CspE2eGroupMessageUpdateType.GROUP_DELETE_MESSAGE,
          GroupMemberContainer.Type
      >;
