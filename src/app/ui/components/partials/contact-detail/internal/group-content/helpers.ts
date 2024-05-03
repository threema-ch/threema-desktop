import type {u53} from '~/common/types';
import type {GroupReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Returns the total count of members in the given group, taking into account the creator and the
 * user themself.
 */
export function getGroupReceiverDataMemberCount(
    groupReceiverData: Pick<GroupReceiverData, 'creator' | 'isLeft' | 'members' | 'type'>,
): u53 {
    // Add `1` to the members length to account for the creator.
    return groupReceiverData.members.length + 1;
}
