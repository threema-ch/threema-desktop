import type {u53} from '~/common/types';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Returns the total count of members in the given group, taking into account the creator and the
 * user themself.
 */
export function getGroupReceiverDataMemberCount(
    groupReceiverData: Pick<
        AnyReceiverData & {readonly type: 'group'},
        'creator' | 'isLeft' | 'members' | 'type'
    >,
): u53 {
    // Add `1` to the members length to account for the creator.
    let memberCount = groupReceiverData.members.length + 1;

    // If the user hasn't left the group and isn't the creator, add `1`.
    if (!groupReceiverData.isLeft && groupReceiverData.creator.type !== 'self') {
        memberCount += 1;
    }

    return memberCount;
}
