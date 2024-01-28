import type {AnyContentItemOptions} from '~/app/ui/components/partials/receiver-card/internal/content-item/types';
import type {I18nType} from '~/app/ui/i18n-types';
import {unreachable} from '~/common/utils/assert';
import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

export function getReceiverCardTopRightItemOptions(
    receiver: AnyReceiverData,
    i18n: I18nType,
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
                    text: i18n.t(
                        'contacts.label--group-members-count-short',
                        '{n, plural, =1 {1 Member} other {# Members}}',
                        // Add `1` to include the creator.
                        {n: String(receiver.members.length + 1)},
                    ),
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
): AnyContentItemOptions[] | undefined {
    switch (receiver.type) {
        case 'contact': {
            const {isInactive, isInvalid, nickname} = receiver;

            if (!isInactive && !isInvalid && nickname === undefined) {
                return undefined;
            }

            return [
                ...(!isInactive && !isInvalid
                    ? []
                    : [
                          {
                              type: 'tags',
                              isInactive,
                              isInvalid,
                          } as const,
                      ]),
                ...(nickname === undefined
                    ? []
                    : [
                          {
                              type: 'text',
                              text: nickname,
                          } as const,
                      ]),
            ];
        }

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
                          text: memberNames,
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
