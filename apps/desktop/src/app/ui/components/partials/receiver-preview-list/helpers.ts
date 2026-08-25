import type {AnyContentItemOptions} from '~/app/ui/components/partials/receiver-card/internal/content-item/types';
import type {
    ReceiverPreviewListItem,
    ReceiverPreviewListProps,
} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {I18nType} from '~/app/ui/i18n-types';
import type {DbContactUid} from '~/common/db';
import {assert, unreachable} from '~/common/utils/assert';
import type {IQueryableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {
    isContactReceiverData,
    isSelfReceiverData,
    type AnyReceiverData,
    type AnyReceiverDataOrSelf,
} from '~/common/viewmodel/utils/receiver';

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
                    text: {
                        raw: i18n.t(
                            'groups.label--group-members-count-short',
                            '{n, plural, =1 {1 Member} other {# Members}}',
                            // Add `1` to include the creator.
                            {n: String(receiver.members.length + 1)},
                        ),
                    },
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
    receiver: AnyReceiverDataOrSelf & {
        readonly isCreator?: boolean;
    },
): AnyContentItemOptions[] | undefined {
    switch (receiver.type) {
        case 'contact': {
            const {isCreator = false, isInactive, isInvalid, nickname} = receiver;

            if (!isCreator && !isInactive && !isInvalid && nickname === undefined) {
                return undefined;
            }

            return [
                ...(!isCreator
                    ? []
                    : [
                          {
                              type: 'tags',
                              isCreator,
                          } as const,
                      ]),
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
                              text: {
                                  raw: nickname,
                              },
                          } as const,
                      ]),
            ];
        }

        // TODO(DESK-236): Implement distribution lists.
        case 'distribution-list':
            return undefined;

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
                          text: {
                              raw: memberNames,
                          },
                      },
                  ];
        }

        case 'self': {
            const {isCreator = false} = receiver;

            if (!isCreator) {
                return undefined;
            }

            return [
                {
                    type: 'tags',
                    isCreator,
                } as const,
            ];
        }

        default:
            return unreachable(receiver);
    }
}

function isNotShownInList(
    itemStore: IQueryableStore<ReceiverPreviewListItem<unknown>>,
    selectedContacts: ReadonlySet<DbContactUid>,
): boolean {
    const {receiver} = itemStore.get();

    // Only retain contacts that were added manually by the user.
    if (!isContactReceiverData(receiver)) {
        return true;
    }

    // If a contact is already in the list (eg. was selected before) we need to be able to deselect
    // the contact.
    if (selectedContacts.has(receiver.lookup.uid)) {
        return false;
    }

    // For groups, we disallow selecting invalid contacts.
    return receiver.isInvalid;
}

function buildSelectableContacts(
    currentItems: IQueryableStore<ReceiverPreviewListItem<unknown>>[],
    selectedContacts: ReadonlySet<DbContactUid>,
): ReceiverPreviewListProps<unknown>['items'] {
    return currentItems.flatMap((itemStore) => {
        if (isNotShownInList(itemStore, selectedContacts)) {
            return [];
        }

        return derive([itemStore], ([{currentValue: item}]) => {
            const {receiver} = item;

            // Assertion is fine because we filter out the corresponding values above.
            assert(isContactReceiverData(receiver));

            const uid = receiver.lookup.uid;
            const isSelected = selectedContacts.has(uid);

            return {
                ...item,
                interaction: {
                    mode: 'select',
                    isSelected,
                },
            };
        });
    });
}

/**
 * Return whether the given `receiver` matches the provided `searchTerm`. Note: If the `searchTerm`
 * is `undefined` or an empty string, the result will always be `true`.
 */
function isReceiverMatchingSearchTerm(
    receiver: AnyReceiverData,
    searchTerm: string | undefined,
): boolean {
    if (searchTerm === undefined) {
        return true;
    }

    const trimmedSearchTerm = searchTerm.trim().toLowerCase();
    if (trimmedSearchTerm === '') {
        return true;
    }

    switch (receiver.type) {
        case 'contact':
            return [
                receiver.name,
                receiver.firstName,
                receiver.lastName,
                receiver.nickname,
                receiver.identity,
            ]
                .filter((value) => value !== undefined)
                .join(' ')
                .toLowerCase()
                .includes(trimmedSearchTerm);

        case 'distribution-list':
        case 'group':
            return [receiver.name].join(' ').toLowerCase().includes(trimmedSearchTerm);

        default:
            return unreachable(receiver);
    }
}

// TODO(DESK-236) Add distribution lists here.
export function isReceiverPreviewListItemRetained(
    itemStore: IQueryableStore<ReceiverPreviewListItem<unknown>>,
    currentSearchTerm?: string,
    allowedTypes?: readonly AnyReceiverData['type'][],
): boolean {
    const item = itemStore.get();

    // Receivers of type "self" don't make sense in the address book. In practice, this case
    // should never happen, but if such items are provided, we'll filter them out.
    if (isSelfReceiverData(item.receiver) || allowedTypes?.includes(item.receiver.type) === false) {
        return false;
    }

    // Filter items by `searchTerm`.
    if (currentSearchTerm !== undefined && currentSearchTerm !== '') {
        return isReceiverMatchingSearchTerm(item.receiver, currentSearchTerm);
    }

    return true;
}

export function buildFilteredAndSummaryItems(
    contacts: IQueryableStore<ReceiverPreviewListItem<unknown>>[],
    selectedContacts: ReadonlySet<DbContactUid>,
    searchTerm?: string,
): {
    filteredSelectableContacts: IQueryableStore<ReceiverPreviewListItem<unknown>>[];
    summaryContacts: IQueryableStore<ReceiverPreviewListItem<unknown>>[];
} {
    const allSelectableContacts = buildSelectableContacts(contacts, selectedContacts);

    const filteredContacts = allSelectableContacts.flatMap((itemStore) =>
        isReceiverPreviewListItemRetained(itemStore, searchTerm, ['contact']) ? itemStore : [],
    );

    const summaryItems = allSelectableContacts.filter((item) => {
        const {receiver} = item.get();
        return isContactReceiverData(receiver) && selectedContacts.has(receiver.lookup.uid);
    });

    return {
        filteredSelectableContacts: filteredContacts,
        summaryContacts: summaryItems,
    };
}
