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
          readonly reason:
              | 'no-blob-bytes'
              | 'unsupported-media-message-type'
              | 'unsupported-message-type'
              | 'unknown';
          readonly error?: Error;
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
): Promise<MediaState> {
    return await controller
        .getBlob()
        .then((bytes) => {
            if (bytes === undefined) {
                return {
                    status: 'failed',
                    reason: 'no-blob-bytes',
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
                    return {
                        status: 'failed',
                        reason: 'unsupported-media-message-type',
                    } as const;

                case 'location':
                case 'quote':
                case 'text':
                    return {
                        status: 'failed',
                        reason: 'unsupported-message-type',
                    } as const;

                default:
                    return unreachable(message);
            }
        })
        .catch(
            (error) =>
                ({
                    status: 'failed',
                    reason: 'unknown',
                    error: ensureError(error),
                } as const),
        );
}
