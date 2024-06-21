import type {ModalButton} from '~/app/ui/components/hocs/modal/props';
import type {
    MessageListDeletedMessage,
    MessageListRegularMessage,
    MessageListStatusMessage,
} from '~/app/ui/components/partials/conversation/internal/message-list/props';
import type {I18nType} from '~/app/ui/i18n-types';
import {DELETE_MESSAGE_GRACE_PERIOD_IN_MINUTES} from '~/common/network/protocol/constants';

/**
 * Returns whether deleting the given message for everyone in the conversation is supported under
 * the current circumstances (e.g., feature support, send time, etc.).
 */
export function deleteForEveryoneSupported(
    /**
     * Required details about the message that the user wants to delete to determine whether it is
     * deletable.
     */
    message:
        | Pick<
              MessageListRegularMessage | MessageListDeletedMessage,
              'direction' | 'status' | 'type'
          >
        | MessageListStatusMessage,
    /**
     * Whether the feature is enabled for the user, regardless of the message specifics.
     */
    isFeatureSupported: boolean,
): boolean {
    if (message.type === 'deleted-message' || message.type === 'status-message') {
        // Makes no sense, because messages of type `"deleted-message"` have already been deleted
        // for everyone and messages of type `"status-message"` are local-only.
        return false;
    }

    return (
        message.direction === 'outbound' &&
        message.status.sent !== undefined &&
        isFeatureSupported &&
        // TODO(DESK-1451) Remove the sandbox check.
        import.meta.env.BUILD_ENVIRONMENT === 'sandbox' &&
        Date.now() - message.status.sent.at.getTime() <
            DELETE_MESSAGE_GRACE_PERIOD_IN_MINUTES * 60000
    );
}

/**
 * Returns the buttons that should be displayed as part of the `DeleteMessageModal`.
 */
export function getModalButtons(
    message:
        | Pick<
              MessageListRegularMessage | MessageListDeletedMessage,
              'direction' | 'status' | 'type'
          >
        | MessageListStatusMessage,
    /**
     * Whether the feature is enabled for the user, regardless of the message specifics.
     */
    isFeatureSupported: boolean,
    handleClickDeleteLocally: () => void,
    handleClickDeleteForEveryone: () => void,
    i18n: I18nType,
): ModalButton[] {
    const buttons: ModalButton[] = [
        {
            label: i18n.t('dialog--delete-message.action--cancel', 'Cancel'),
            type: 'naked',
            onClick: 'close',
        },

        {
            label: i18n.t('dialog--delete-message.action--delete-locally', 'Delete on This Device'),
            type: 'naked',
            onClick: handleClickDeleteLocally,
        },
    ];
    if (deleteForEveryoneSupported(message, isFeatureSupported)) {
        buttons.push({
            label: i18n.t(
                'dialog--delete-message.action--delete-for-everyone',
                'Delete for Everyone',
            ),
            type: 'naked',
            onClick: handleClickDeleteForEveryone,
        });
    }

    return buttons;
}
