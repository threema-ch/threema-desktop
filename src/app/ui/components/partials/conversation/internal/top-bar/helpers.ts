import type {AnyContentItemOptions} from '~/app/ui/components/partials/receiver-card/internal/content-item/types';
import {unreachable} from '~/common/utils/assert';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

export function getReceiverCardBottomLeftItemOptions(
    receiver: AnyReceiverData,
): AnyContentItemOptions[] | undefined {
    switch (receiver.type) {
        case 'contact':
            return [
                {
                    type: 'verification-dots',
                    receiver,
                },
            ];

        case 'group': {
            const memberNames = [receiver.creator, ...receiver.members]
                .map((member) => member.name)
                .sort()
                .join(', ');

            return memberNames === ''
                ? undefined
                : [
                      {
                          type: 'text',
                          text: {raw: memberNames},
                      },
                  ];
        }

        // TODO(DESK-236): Implement distribution lists.
        case 'distribution-list':
            return undefined;

        default:
            return unreachable(receiver);
    }
}
