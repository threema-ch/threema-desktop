import {tag} from '@threema/ts-utils/meta/newtype';

import type {RemoteGroupEditViewModelStoreValue} from '~/app/ui/components/partials/modals/edit-group-members-modal/types';
import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {ReceiverPreviewListId} from '~/app/ui/components/partials/receiver-preview-list/types';
import {InactiveContactsPolicy} from '~/common/enum';
import type {AppearanceSettingsView} from '~/common/model/types/settings';
import type {PropertiesMarked, PropertiesMarkedRemote} from '~/common/utils/endpoint';
import type {IQueryableStore} from '~/common/utils/store';
import {derive, type GetAndSubscribeFunction} from '~/common/utils/store/derived-store';
import type {GroupEditViewModel} from '~/common/viewmodel/receiver/edit/group/store/types';

/**
 * Transforms the `GroupEditViewModelStore` to a new store containing all contacts that should be
 * displayed according to the settings.
 */
export function groupEditViewModelStoreToContactList(
    groupEditViewModelstore: IQueryableStore<RemoteGroupEditViewModelStoreValue | undefined>,
    appearanceSettings: AppearanceSettingsView,
): IQueryableStore<ReceiverPreviewListProps['items']> {
    return derive(
        [groupEditViewModelstore],
        ([{currentValue: groupEditViewModel}], getAndSubscribe) =>
            getSortedContactItems(groupEditViewModel, getAndSubscribe, appearanceSettings) ?? [],
    );
}

function getSortedContactItems(
    receiverListViewModel:
        | PropertiesMarkedRemote<GroupEditViewModel & PropertiesMarked>
        | undefined,
    getAndSubscribe: GetAndSubscribeFunction,
    appearanceSettings: AppearanceSettingsView,
): ReceiverPreviewListProps['items'] | undefined {
    const contactListItemSetStore = receiverListViewModel?.contactListItemSetStore;
    if (contactListItemSetStore === undefined) {
        return undefined;
    }
    return [...getAndSubscribe(contactListItemSetStore)]
        .map((viewModelBundle) =>
            derive([viewModelBundle.viewModelStore], ([{currentValue: viewModel}]) => ({
                handlerProps: undefined,
                id: tag<ReceiverPreviewListId>(viewModel.receiver.id),
                receiver: viewModel.receiver,
            })),
        )
        .filter(
            (item) =>
                item.get().receiver.acquaintanceLevel === 'direct' &&
                !(
                    appearanceSettings.inactiveContactsPolicy === InactiveContactsPolicy.HIDE &&
                    item.get().receiver.isInactive
                ),
        )
        .sort((a, b) =>
            getAndSubscribe(a, ['receiver']).receiver.name.localeCompare(
                getAndSubscribe(b, ['receiver']).receiver.name,
            ),
        );
}
