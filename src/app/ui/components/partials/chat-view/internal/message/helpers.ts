import type {MessageProps} from '~/app/ui/components/partials/chat-view/internal/message/props';
import type {I18nType} from '~/app/ui/i18n-types';
import {type SanitizedHtml, sanitizeAndParseTextToHtml} from '~/app/ui/utils/text';
import {unreachable} from '~/common/utils/assert';
import type {Mention} from '~/common/viewmodel/utils/mentions';

/**
 * Sanitizes and parses raw text from a text message to HTML.
 */
export function getTextContent(
    raw: string | undefined,
    mentions: Mention | Mention[] | undefined,
    t: I18nType['t'],
): SanitizedHtml | undefined {
    const html = sanitizeAndParseTextToHtml(raw, t, {
        highlights: [],
        mentions,
        shouldLinkMentions: true,
        shouldParseLinks: true,
        shouldParseMarkup: true,
    });

    return html === '' ? undefined : html;
}

/**
 * Returns whether the given value is a file which is unsynced or syncing.
 */
export function isUnsyncedOrSyncingFile(value: MessageProps['file']): value is NonNullable<
    MessageProps['file'] & {
        sync: {
            state: 'unsynced' | 'syncing';
        };
    }
> {
    if (value === undefined) {
        return false;
    }

    switch (value.sync.state) {
        case 'unsynced':
        case 'syncing':
            return true;
        case 'synced':
        case 'failed':
            return false;
        default:
            return unreachable(value.sync.state);
    }
}

/**
 * Get the translated label for the diven file sync direction and file type.
 *
 * @param file The file to get the translated sync label for.
 * @param t The function used for translating.
 */
export function getTranslatedSyncButtonTitle(
    file: NonNullable<MessageProps['file']>,
    t: I18nType['t'],
): string {
    switch (file.sync.direction) {
        case 'download':
            switch (file.type) {
                case 'audio':
                    return t('messaging.action--sync-audio-download', 'Download voice message');

                case 'file':
                    return t('messaging.action--sync-file-download', 'Download file');

                case 'image':
                    return t('messaging.action--sync-image-download', 'Download image');

                case 'video':
                    return t('messaging.action--sync-video-download', 'Download video');

                default:
                    return unreachable(file.type);
            }

        case 'upload':
            switch (file.type) {
                case 'audio':
                    return t('messaging.action--sync-audio-upload', 'Upload voice message');

                case 'file':
                    return t('messaging.action--sync-file-upload', 'Upload file');

                case 'image':
                    return t('messaging.action--sync-image-upload', 'Upload image');

                case 'video':
                    return t('messaging.action--sync-video-upload', 'Upload video');

                default:
                    return unreachable(file.type);
            }

        case undefined:
            return t('messaging.action--sync-unknown-direction', 'Unknown sync direction');

        default:
            return unreachable(file.sync.direction);
    }
}