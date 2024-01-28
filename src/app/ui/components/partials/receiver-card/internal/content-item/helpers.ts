import type {
    ReceiverNameContentItemOptions,
    TextContentItemOptions,
} from '~/app/ui/components/partials/receiver-card/internal/content-item/types';
import {unreachable} from '~/common/utils/assert';

export function getTextContentItemOptionsFromReceiverNameContentItemOptions(
    receiver: ReceiverNameContentItemOptions['receiver'],
): TextContentItemOptions {
    switch (receiver.type) {
        case 'contact': {
            let decoration: TextContentItemOptions['decoration'];
            if (receiver.isDisabled) {
                decoration = 'strikethrough';
            } else if (receiver.isInactive) {
                decoration = 'semi-transparent';
            }

            return {
                type: 'text',
                text: receiver.name,
                decoration,
            };
        }

        case 'group':
            return {
                type: 'text',
                text: receiver.name,
                decoration: receiver.isDisabled ? 'strikethrough' : undefined,
            };

        // TODO(DESK-236): Implement distribution lists.
        case 'distribution-list':
            throw new Error('TODO(DESK-236): Implement distribution lists');

        default:
            return unreachable(receiver);
    }
}
