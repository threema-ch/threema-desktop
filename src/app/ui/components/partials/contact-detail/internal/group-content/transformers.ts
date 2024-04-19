import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {u53} from '~/common/types';
import type {GroupReceiverData, SelfReceiverData} from '~/common/viewmodel/utils/receiver';

/**
 * Transforms an array of group members to a new store compatible with the shape of props expected
 * by `ReceiverPreviewList` component.
 */
export function groupReceiverDataToReceiverPreviewListProps(
    groupReceiverData: GroupReceiverData,
    selfReceiverData: SelfReceiverData,
    /**
     * Max. number of items to include. If this is not provided, all items will be transformed.
     * Note: The creator and the user themself will always be included, even if the limit is lower.
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

    // Get the user props, so we can add it to the list (except if the user is the creator or has
    // left the group).
    const self: ReceiverPreviewListProps['items'] =
        groupReceiverData.creator.type === 'self' || groupReceiverData.isLeft
            ? []
            : [
                  {
                      handlerProps: undefined,
                      receiver: selfReceiverData,
                  },
              ];

    return {
        items: [
            ...creator,
            ...groupReceiverData.members
                .sort((a, b) => a.name.localeCompare(b.name))
                // Already limit members here, so they don't all need to be mapped.
                .slice(0, limit)
                .map((receiver) => ({
                    handlerProps: undefined,
                    receiver,
                })),
            ...self,
        ]
            // Slice members again to respect the precise limit.
            .slice(0, limit),
    };
}
