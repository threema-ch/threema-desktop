import type {
    AnyContentItemOptions,
    TextContentItemOptions,
} from '~/app/ui/components/partials/receiver-card/internal/content-item/types';
import {unreachable} from '~/common/utils/assert';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

export function getReceiverCardTopLeftItemOptions(
    receiver: AnyReceiverData,
): AnyContentItemOptions[] {
    switch (receiver.type) {
        case 'contact': {
            let decoration: TextContentItemOptions['decoration'];
            if (receiver.isDisabled) {
                decoration = 'strikethrough';
            } else if (receiver.isInactive) {
                decoration = 'semi-transparent';
            }

            return [
                {
                    type: 'text',
                    text: receiver.name,
                    decoration,
                },
            ];
        }

        case 'group':
            return [
                {
                    type: 'text',
                    text: receiver.name,
                    decoration: receiver.isDisabled ? 'strikethrough' : undefined,
                },
            ];

        // TODO(DESK-236): Implement distribution lists.
        case 'distribution-list':
            return [];

        default:
            return unreachable(receiver);
    }
}

export function getReceiverCardBottomLeftItemOptions(
    receiver: AnyReceiverData,
): AnyContentItemOptions[] {
    switch (receiver.type) {
        case 'contact':
            return [
                {
                    type: 'verification-dots',
                    receiver,
                },
            ];

        case 'group':
            return [
                {
                    type: 'text',
                    text: [receiver.creator, ...receiver.members]
                        .map((member) => member.name)
                        .sort()
                        .join(', '),
                },
            ];

        // TODO(DESK-236): Implement distribution lists.
        case 'distribution-list':
            return [];

        default:
            return unreachable(receiver);
    }
}
