import {isReceiverMatchingSearchTerm} from '~/app/ui/components/partials/address-book/helpers';
import type {MentionProps} from '~/app/ui/components/partials/mention/props';
import type {ReceiverPreviewListItem} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {i18n as i18nStore} from '~/app/ui/i18n';
import {toast} from '~/app/ui/snackbar';
import type {FileResult} from '~/app/ui/svelte-components/utils/filelist';
import {type FileLoadResult, validateFiles} from '~/app/ui/utils/file';
import type {Logger} from '~/common/logging';
import {ensureIdentityString} from '~/common/network/types';
import type {u53} from '~/common/types';
import {assert, unreachable} from '~/common/utils/assert';
import type {
    AnyReceiverData,
    ContactReceiverData,
    GroupReceiverData,
} from '~/common/viewmodel/utils/receiver';

/**
 * Prepares files from various sources (e.g., dropping, attaching, etc.) by validating them and
 * showing an appropriate toast to the user if necessary.
 *
 * @returns An array of validated, accessible {@link File}s that can be used to initialize the
 *   `MediaComposeModal`.
 */
export async function prepareFilesForMediaComposeModal(
    i18n: typeof i18nStore,
    log: Logger,
    files?: File[] | FileLoadResult | FileResult,
): Promise<File[] | undefined> {
    let validatedFiles: FileLoadResult | undefined = undefined;
    if (files !== undefined) {
        if (files instanceof Array) {
            await validateFiles(files)
                .then((result) => {
                    validatedFiles = result;
                })
                .catch((error: unknown) =>
                    log.error(`An error occurred when validating files: ${error}`),
                );
        } else {
            validatedFiles = files;
        }
    }

    if (validatedFiles === undefined) {
        return undefined;
    }

    switch (validatedFiles.status) {
        case 'empty':
        case 'inaccessible':
            showFileResultErrorToast(validatedFiles.status, i18n, log);
            return undefined;

        case 'partial':
            showFileResultErrorToast(validatedFiles.status, i18n, log);
            break;

        case 'ok':
            break;

        default:
            unreachable(validatedFiles);
    }

    return validatedFiles.files;
}

/**
 * Displays an appropriate error toast for the given file result error.
 */
export function showFileResultErrorToast(
    status: 'empty' | 'inaccessible' | 'partial',
    i18n: typeof i18nStore,
    log: Logger,
): void {
    switch (status) {
        case 'empty':
            log.warn('A file or list of files was added, but it was empty');
            toast.addSimpleFailure(
                i18n.get().t('messaging.error--add-files-empty', "Files couldn't be added"),
            );
            break;

        case 'inaccessible':
            log.warn('A file or list of files was added, but it could not be accessed');
            toast.addSimpleFailure(
                i18n
                    .get()
                    .t('messaging.error--add-files-inaccessible', "Files couldn't be accessed"),
            );
            break;

        case 'partial':
            log.warn('A file or list of files was added, but some files could not be accessed');
            toast.addSimpleWarning(
                i18n
                    .get()
                    .t(
                        'messaging.error--add-files-partially-inaccessible',
                        "Some files couldn't be accessed",
                    ),
            );
            break;

        default:
            unreachable(status);
    }
}

/**
 * Returns {@link ReceiverPreviewListItem}s for the group members that match the given search query.
 */
export function getFilteredMentionReceiverPreviewListItems(
    group: GroupReceiverData,
    query: string,
): ReceiverPreviewListItem<undefined>[] {
    return group.members
        .concat(group.creator)
        .filter(
            (receiver): receiver is ContactReceiverData =>
                receiver.type === 'contact' &&
                (isReceiverMatchingSearchTerm(receiver, query) || query === ''),
        )
        .map((receiver) => ({
            handlerProps: undefined,
            receiver,
        }));
}

type ParsedTextChunk =
    | {readonly type: 'text'; readonly text: string}
    | {readonly type: 'mention'; readonly mention: MentionProps['mention']};

/**
 * Parses and chunks the given {@link text}, replacing mentions with {@link MentionProps}. Note: If
 * the receiver is not a group or the group has no members, no mentions will be replaced.
 */
export function getParsedTextChunks(
    receiver: AnyReceiverData | undefined,
    text: string,
    log: Logger,
): ParsedTextChunk[] {
    if (text === '') {
        return [];
    }
    if (receiver?.type !== 'group' || receiver.members.length === 0) {
        return [{type: 'text', text}];
    }

    // `matchAll` requires the stateful `g` flag.
    // eslint-disable-next-line threema/ban-stateful-regex-flags
    const regexp = new RegExp(
        [
            '(@\\[@@@@@@@@\\])',
            ...receiver.members
                .concat(receiver.creator)
                .map((member) => `(@\\[${member.identity}\\])`),
        ].join('|'),
        'ug',
    );
    const matches = text.matchAll(regexp);

    let lastMatchEnd: u53 = 0;
    const chunked: ParsedTextChunk[] = [];
    for (const match of matches) {
        // Push text from the index of the last end up to (but not including) the index of the last
        // match into the results array.
        chunked.push({type: 'text', text: text.substring(lastMatchEnd, match.index)});

        // Find the `ContactReceiverData` of the matched ID and add it to the results array.
        const identity = match[0].substring(2, 10);
        try {
            if (identity === '@@@@@@@@') {
                chunked.push({
                    type: 'mention',
                    mention: {
                        type: 'everyone',
                        identity,
                    },
                });
            } else {
                const contact = receiver.members
                    .concat(receiver.creator)
                    .find(
                        (member): member is ContactReceiverData =>
                            member.type === 'contact' &&
                            member.identity === ensureIdentityString(identity),
                    );
                assert(contact !== undefined, 'Matched contact must be a group member');

                chunked.push({type: 'mention', mention: contact});
            }
        } catch (error) {
            log.error(`Error parsing text chunks: ${error}`);
            // Because the mention couldn't be resolved, we insert it as text.
            chunked.push({type: 'text', text: `@[${identity}]`});
        }

        lastMatchEnd = match.index + match[0].length;
    }

    // Add the rest of the text.
    chunked.push({type: 'text', text: text.substring(lastMatchEnd)});

    return chunked;
}
