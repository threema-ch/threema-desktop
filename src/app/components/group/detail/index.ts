import {type Contact} from '~/common/model';
import {type RemoteModelStore} from '~/common/model/utils/model-store';
import {type IdentityString} from '~/common/network/types';

/**
 * Sort group members by display name. Creator will always be shown as first member.
 */
export function sortGroupMembers(
    members: ReadonlySet<RemoteModelStore<Contact>>,
    creatorIdentity: IdentityString,
): readonly RemoteModelStore<Contact>[] {
    return (
        [...members]
            // Sort by display name
            .sort((storeA, storeB) => {
                const nameA = storeA.get().view.displayName;
                const nameB = storeB.get().view.displayName;
                if (nameA < nameB) {
                    return -1;
                } else if (nameA > nameB) {
                    return 1;
                } else {
                    return 0;
                }
            })
            // Sort by creator (creator should be always first member)
            .sort((storeA, storeB) => {
                if (storeA.get().view.identity === creatorIdentity) {
                    return -1;
                }
                if (storeB.get().view.identity === creatorIdentity) {
                    return 1;
                }
                return 0;
            })
    );
}
