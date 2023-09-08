import {type I18nType} from '~/app/ui/i18n-types';
import {BlobFetchError} from '~/common/error';
import {type Logger} from '~/common/logging';
import {type ReadonlyUint8Array} from '~/common/types';
import {ensureError, unreachable} from '~/common/utils/assert';
import {type RemoteProxy} from '~/common/utils/endpoint';
import {type ConversationMessageViewModelController} from '~/common/viewmodel/conversation-message';
import {type AnyMessageBody, type Message, type MessageBody} from '~/common/viewmodel/types';

/**
 * Union of {@link Message} types supported by the media viewer.
 */
export type MediaViewerMessage = Message<MessageBody<'image'>> | Message<MessageBody<'video'>>;

/**
 * Union type of events emitted by a media preview context menu.
 */
export type MediaViewerContextMenuEvent = 'clicksave' | 'clickcopy';

/**
 * States used to describe the progress when loading the media.
 */
export type MediaState =
    | {readonly status: 'loading'}
    | {
          readonly status: 'failed';
          readonly localizedReason?: string;
      }
    | LoadedImageState
    | LoadedVideoState;

/**
 * State describing a loaded image.
 */
export interface LoadedImageState {
    readonly status: 'loaded';
    readonly type: Extract<MediaViewerMessage['type'], 'image'>;
    readonly originalImageBytes: ReadonlyUint8Array;
    readonly url: string;
}

/**
 * State describing a loaded video.
 */
export interface LoadedVideoState {
    readonly status: 'loaded';
    readonly type: Extract<MediaViewerMessage['type'], 'video'>;
    readonly url: string;
}

/**
 * Fetch a media blob from a `viewModelController` and return it as a {@link MediaState}.
 *
 * @param controller The `viewModelController` to fetch the blob with.
 * @returns A `MediaState` of the loaded or failed blob.
 */
export async function fetchMedia(
    controller: RemoteProxy<ConversationMessageViewModelController>,
    message: Message<AnyMessageBody>,
    log: Logger,
    t: I18nType['t'],
): Promise<MediaState> {
    return await controller
        .getBlob()
        .then((bytes) => {
            if (bytes === undefined) {
                // The getBlob method for main blob bytes resolves with `undefined` if the message
                // type is unsupported (e.g. for a text message).
                log.warn('fetchMedia: getBlob returned undefined');
                return {
                    status: 'failed',
                } as const;
            }

            switch (message.type) {
                case 'image':
                    return {
                        status: 'loaded',
                        type: 'image',
                        originalImageBytes: bytes,
                        url: URL.createObjectURL(new Blob([bytes], {type: message.body.mediaType})),
                    } as const;

                case 'video':
                    return {
                        status: 'loaded',
                        type: 'video',
                        url: URL.createObjectURL(new Blob([bytes], {type: message.body.mediaType})),
                    } as const;

                case 'file':
                case 'audio':
                case 'location':
                case 'quote':
                case 'text':
                    log.error(`fetchMedia was called for a ${message.type} message`);
                    return {
                        status: 'failed',
                    } as const;

                default:
                    return unreachable(message);
            }
        })
        .catch((error) => {
            function fail(localizedReason?: string): MediaState {
                return {status: 'failed', localizedReason};
            }
            log.warn(`Blob fetch failed: ${error}`);
            if (error instanceof BlobFetchError) {
                switch (error.type.kind) {
                    case 'file-storage-error': {
                        switch (error.type.cause) {
                            case 'write-error':
                                return fail(
                                    t(
                                        'dialog--media-message-viewer.error--file-storage-write-error',
                                        'Downloaded media could not be stored in file storage. Do you have enough free disk space?',
                                    ),
                                );
                            case 'not-found':
                            case 'dir-not-found':
                            case 'read-error':
                            case 'delete-error':
                            case 'unsupported-format':
                            case undefined:
                                return fail(
                                    t(
                                        'dialog--media-message-viewer.error--file-storage-read-error',
                                        'Could not read media from file storage.',
                                    ),
                                );
                            default:
                                return unreachable(error.type);
                        }
                    }
                    case 'temporary-download-error':
                        return fail(
                            t(
                                'dialog--media-message-viewer.error--temporary-download-error',
                                'Media download failed. Please check your internet connection and try again.',
                            ),
                        );
                    case 'permanent-download-error':
                        return fail(
                            t(
                                'dialog--media-message-viewer.error--permanent-download-error',
                                'Media could not be downloaded, the download expired.',
                            ),
                        );
                    case 'decryption-error':
                        return fail(
                            t(
                                'dialog--media-message-viewer.error--decryption-error',
                                'Media could not be decrypted.',
                            ),
                        );
                    case 'internal':
                        return fail(
                            t(
                                'dialog--media-message-viewer.error--internal-error',
                                'Media could not be loaded due to an internal error.',
                            ),
                        );
                    default:
                        return unreachable(error.type);
                }
            } else {
                return {
                    status: 'failed',
                    error: ensureError(error),
                } as const;
            }
        });
}
