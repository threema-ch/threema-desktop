import {
    type CspE2eConversationType,
    type CspE2eGroupControlType,
    type CspE2eGroupConversationType,
    type CspE2eStatusUpdateType,
} from '~/common/enum';
import {type CspE2eType} from '~/common/network/protocol';

import * as DeliveryReceipt from './delivery-receipt';
import * as GroupCreatorContainer from './group-creator-container';
import * as GroupMemberContainer from './group-member-container';
import * as GroupName from './group-name';
import * as GroupSetup from './group-setup';
import * as Location from './location';
import * as Text from './text';
export {
    DeliveryReceipt,
    GroupCreatorContainer,
    GroupMemberContainer,
    Location,
    GroupName,
    GroupSetup,
    Text,
};

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
export type ValidatedCspE2eTypes =
    // Contact conversation messages
    | ValidatedCspE2eMessageType<CspE2eConversationType.TEXT, Text.Type>
    | ValidatedCspE2eMessageType<CspE2eConversationType.LOCATION, Location.Type>

    // Group conversation messages
    | ValidatedCspE2eMessageType<
          CspE2eGroupConversationType.GROUP_TEXT,
          Text.Type,
          GroupMemberContainer.Type
      >
    | ValidatedCspE2eMessageType<
          CspE2eGroupConversationType.GROUP_LOCATION,
          Location.Type,
          GroupMemberContainer.Type
      >

    // Group control messages
    | ValidatedCspE2eMessageType<
          CspE2eGroupControlType.GROUP_SETUP,
          GroupSetup.Type,
          GroupCreatorContainer.Type
      >
    | ValidatedCspE2eMessageType<
          CspE2eGroupControlType.GROUP_NAME,
          GroupName.Type,
          GroupCreatorContainer.Type
      >
    | ValidatedCspE2eMessageType<
          CspE2eGroupControlType.GROUP_LEAVE,
          void,
          GroupMemberContainer.Type
      >
    | ValidatedCspE2eMessageType<
          CspE2eGroupControlType.GROUP_REQUEST_SYNC,
          void,
          GroupCreatorContainer.Type
      >

    // Status messages
    | ValidatedCspE2eMessageType<CspE2eStatusUpdateType.DELIVERY_RECEIPT, DeliveryReceipt.Type>;
