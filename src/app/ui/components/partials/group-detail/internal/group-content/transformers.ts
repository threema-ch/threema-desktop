import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {u53} from '~/common/types';
import type {GroupReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Transforms an array of group members to a new store compatible with the shape of props expected
 * by `ReceiverPreviewList` component.
 */
export function groupReceiverDataToReceiverPreviewListProps(
    groupReceiverData: GroupReceiverData,
    /**
     * Max. number of items to include. If this is not provided, all items will be transformed.
     * Note: The creator will always be included, even if the limit is lower. The user is always shown at the end.
     */
    limit?: u53,
): Omit<ReceiverPreviewListProps, 'services'> {
    // Get the creator props, so we can add it to the list.
    const creator: ReceiverPreviewListProps['items'] = [
        {
            handlerProps: undefined,
            receiver: {
                ...groupReceiverData.creator,
                isCreator: true,
            },
        },
    ];

    const sortedMembers = groupReceiverData.members.sort((a, b) => {
        // Always sort `self` to the end
        if (a.type === 'self') {
            return 1;
        }
        if (b.type === 'self') {
            return -1;
        }
        return a.name.localeCompare(b.name);
    });

    return {
        items: [
            ...creator,
            ...sortedMembers.map((receiver) => ({
                handlerProps: undefined,
                receiver,
            })),
        ]
            // Slice members again to respect the precise limit.
            .slice(0, limit),
    };
}
