import type {ModalButton} from '~/app/ui/components/hocs/modal/props';
import type {I18nType} from '~/app/ui/i18n-types';
import {DELETE_MESSAGE_GRACE_PERIOD_IN_MINUTES} from '~/common/network/protocol/constants';

export function deleteForEveryoneSupported(
    deletedAt: Date | undefined,
    direction: 'inbound' | 'outbound',
    sent: {at: Date} | undefined,
    featureSupported: boolean,
): boolean {
    return (
        deletedAt === undefined &&
        direction === 'outbound' &&
        sent !== undefined &&
        featureSupported &&
        // TODO(DESK-1451) Remove the sandbox check
        import.meta.env.BUILD_ENVIRONMENT === 'sandbox' &&
        Date.now() - sent.at.getTime() < DELETE_MESSAGE_GRACE_PERIOD_IN_MINUTES * 60000
    );
}

export function getModalButtons(
    deletedAt: Date | undefined,
    direction: 'inbound' | 'outbound',
    sent: {at: Date} | undefined,
    featureSupported: boolean,
    i18n: I18nType,
    handleClickDeleteLocally: () => void,
    handleClickDeleteForEveryone: () => void,
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
    if (deleteForEveryoneSupported(deletedAt, direction, sent, featureSupported)) {
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
