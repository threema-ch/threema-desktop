import type {AnyContentItemOptions} from '~/app/ui/components/partials/receiver-card/internal/content-item/types';
import type {I18nType} from '~/app/ui/i18n-types';
import {unreachable} from '~/common/utils/assert';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

export function getReceiverCardBottomLeftItemOptions(
    receiver: AnyReceiverData,
    i18n: I18nType,
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
            const memberNames = [
                receiver.creator.type === 'self'
                    ? i18n.t('contacts.label--own-name', 'Me')
                    : receiver.creator.name,
                ...receiver.members
                    .sort((a, b) => {
                        // Always sort `self` to the end
                        if (a.type === 'self') {
                            return 1;
                        }
                        if (b.type === 'self') {
                            return -1;
                        }
                        return a.name.localeCompare(b.name);
                    })
                    .map((member) => {
                        if (member.type === 'self') {
                            return i18n.t('contacts.label--own-name', 'Me');
                        }
                        return member.name;
                    }),
            ].join(', ');

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
