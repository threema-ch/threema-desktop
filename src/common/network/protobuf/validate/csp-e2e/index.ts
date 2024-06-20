import type {
    CspE2eGroupControlType,
    CspE2eGroupMessageUpdateType,
    CspE2eMessageUpdateType,
} from '~/common/enum';
import type {CspE2eType} from '~/common/network/protocol';
import type {
    GroupCreatorContainer,
    GroupMemberContainer,
} from '~/common/network/structbuf/validate/csp/e2e';

import * as DeleteMessage from './delete-message';
import * as EditMessage from './edit-message';
import * as GroupCallStart from './group-call-start';
import * as MessageMetadata from './message-metadata';

export {DeleteMessage, EditMessage, GroupCallStart, MessageMetadata};

/**
 * A validated message with its payload type.
 */
interface ValidatedCspE2eMessageType<
    T extends CspE2eType,
    P,
    C extends GroupMemberContainer.Type | GroupCreatorContainer.Type | undefined = undefined,
> {
    type: T;
    message: P;
    container: C;
}

/**
 * All possible validated message types.
 */
export type ValidatedCspE2eTypesProtobuf =
    // Message updates
    | ValidatedCspE2eMessageType<CspE2eMessageUpdateType.EDIT_MESSAGE, EditMessage.Type>
    | ValidatedCspE2eMessageType<
          CspE2eGroupMessageUpdateType.GROUP_EDIT_MESSAGE,
          EditMessage.Type,
          GroupMemberContainer.Type
      >
    | ValidatedCspE2eMessageType<CspE2eMessageUpdateType.DELETE_MESSAGE, DeleteMessage.Type>
    | ValidatedCspE2eMessageType<
          CspE2eGroupMessageUpdateType.GROUP_DELETE_MESSAGE,
          DeleteMessage.Type,
          GroupMemberContainer.Type
      >

    // Group control messages
    | ValidatedCspE2eMessageType<
          CspE2eGroupControlType.GROUP_CALL_START,
          GroupCallStart.Type,
          GroupMemberContainer.Type
      >;
