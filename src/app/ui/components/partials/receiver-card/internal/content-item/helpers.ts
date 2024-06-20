import type {
    ReceiverNameContentItemOptions,
    TextContentItemOptions,
} from '~/app/ui/components/partials/receiver-card/internal/content-item/types';
import {escapeHtmlUnsafeChars, parseHighlights} from '~/app/ui/utils/text';
import {unreachable} from '~/common/utils/assert';

export function getTextContentItemOptionsFromReceiverNameContentItemOptions(
    receiver: ReceiverNameContentItemOptions['receiver'],
    highlights?: string | readonly string[],
): TextContentItemOptions {
    let decoration: TextContentItemOptions['decoration'];
    switch (receiver.type) {
        case 'contact': {
            if (receiver.isDisabled) {
                decoration = 'strikethrough';
            } else if (receiver.isInactive) {
                decoration = 'semi-transparent';
            }
            break;
        }

        case 'group':
            decoration = receiver.isDisabled ? 'strikethrough' : undefined;
            break;

        // TODO(DESK-236): Implement distribution lists.
        case 'distribution-list':
            throw new Error('TODO(DESK-236): Implement distribution lists');

        default:
            return unreachable(receiver);
    }

    return {
        type: 'text',
        text:
            highlights === undefined
                ? {raw: receiver.name}
                : {
                      html: parseHighlights(
                          escapeHtmlUnsafeChars(receiver.name),
                          typeof highlights === 'string' ? [highlights] : highlights,
                      ),
                  },
        decoration,
    };
}
