import type {
    CspE2eConversationType,
    CspE2eGroupControlType,
    CspE2eGroupConversationType,
    CspE2eGroupStatusUpdateType,
    CspE2eStatusUpdateType,
} from '~/common/enum';
import type {CspE2eType} from '~/common/network/protocol';

import * as DeliveryReceipt from './delivery-receipt';
import * as File from './file';
import * as GroupCreatorContainer from './group-creator-container';
import * as GroupMemberContainer from './group-member-container';
import * as GroupName from './group-name';
import * as GroupSetup from './group-setup';
import * as Location from './location';
import * as SetProfilePicture from './set-profile-picture';
import * as Text from './text';

export {
    DeliveryReceipt,
    File,
    GroupCreatorContainer,
    GroupMemberContainer,
    Location,
    GroupName,
    GroupSetup,
    SetProfilePicture,
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
    | ValidatedCspE2eMessageType<CspE2eConversationType.FILE, File.Type>
    | ValidatedCspE2eMessageType<CspE2eConversationType.LOCATION, Location.Type>

    // Group conversation messages
    | ValidatedCspE2eMessageType<
          CspE2eGroupConversationType.GROUP_TEXT,
          Text.Type,
          GroupMemberContainer.Type
      >
    | ValidatedCspE2eMessageType<
          CspE2eGroupConversationType.GROUP_FILE,
          File.Type,
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
          CspE2eGroupControlType.GROUP_SET_PROFILE_PICTURE,
          SetProfilePicture.Type,
          GroupCreatorContainer.Type
      >
    | ValidatedCspE2eMessageType<
          CspE2eGroupControlType.GROUP_DELETE_PROFILE_PICTURE,
          void,
          GroupCreatorContainer.Type
      >
    | ValidatedCspE2eMessageType<
          CspE2eGroupControlType.GROUP_LEAVE,
          void,
          GroupMemberContainer.Type
      >
    | ValidatedCspE2eMessageType<
          CspE2eGroupControlType.GROUP_SYNC_REQUEST,
          void,
          GroupCreatorContainer.Type
      >

    // Status messages
    | ValidatedCspE2eMessageType<CspE2eStatusUpdateType.DELIVERY_RECEIPT, DeliveryReceipt.Type>
    | ValidatedCspE2eMessageType<
          CspE2eGroupStatusUpdateType.GROUP_DELIVERY_RECEIPT,
          GroupMemberContainer.Type
      >;
