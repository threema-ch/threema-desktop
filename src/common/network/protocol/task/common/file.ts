import {ImageRenderingType, MessageType} from '~/common/enum';
import type {Logger} from '~/common/logging';
import type {AnyMessageModelStore} from '~/common/model';
import type {
    AnyImageMessageModelStore,
    AnyVideoMessageModelStore,
} from '~/common/model/types/message';
import type {CommonAudioMessageInit} from '~/common/model/types/message/audio';
import type {CommonFileMessageInit} from '~/common/model/types/message/file';
import type {CommonImageMessageInit} from '~/common/model/types/message/image';
import type {CommonVideoMessageInit} from '~/common/model/types/message/video';
import {
    type FileJson,
    RAW_AUDIO_METADATA_SCHEMA,
    RAW_IMAGE_METADATA_SCHEMA,
    RAW_VIDEO_METADATA_SCHEMA,
} from '~/common/network/structbuf/validate/csp/e2e/file';
import {unreachable} from '~/common/utils/assert';
import {isSupportedImageType} from '~/common/utils/image';

/**
 * Determines the extra properties from a file message.
 */
export function getFileBasedMessageTypeAndExtraProperties(
    fileData: FileJson,
    log: Logger,
):
    | Pick<CommonFileMessageInit, 'type'>
    | Pick<CommonImageMessageInit, 'type' | 'renderingType' | 'animated' | 'dimensions'>
    | Pick<CommonVideoMessageInit, 'type' | 'duration' | 'dimensions'>
    | Pick<CommonAudioMessageInit, 'type' | 'duration'> {
    const isMediaOrSticker =
        fileData.renderingType === 'media' || fileData.renderingType === 'sticker';
    if (isSupportedImageType(fileData.file.mediaType) && isMediaOrSticker) {
        let imageRenderingType: ImageRenderingType;
        switch (fileData.renderingType) {
            case 'media':
                imageRenderingType = ImageRenderingType.REGULAR;
                break;
            case 'sticker':
                imageRenderingType = ImageRenderingType.STICKER;
                break;
            default:
                unreachable(fileData.renderingType);
        }

        try {
            const parsedMetadata = RAW_IMAGE_METADATA_SCHEMA.parse(fileData.metadata ?? {});

            return {
                type: MessageType.IMAGE,
                renderingType: imageRenderingType,
                animated: parsedMetadata.a,
                dimensions:
                    parsedMetadata.h !== undefined && parsedMetadata.w !== undefined
                        ? {width: parsedMetadata.w, height: parsedMetadata.h}
                        : undefined,
            } as const;
        } catch (error) {
            log.warn(`Image metadata did not pass validation: ${error}`);

            return {
                type: MessageType.IMAGE,
                renderingType: imageRenderingType,
                animated: false,
            } as const;
        }
    } else if (fileData.file.mediaType.startsWith('video/') && isMediaOrSticker) {
        try {
            const parsedMetadata = RAW_VIDEO_METADATA_SCHEMA.parse(fileData.metadata ?? {});

            return {
                type: MessageType.VIDEO,
                duration: parsedMetadata.d,
                dimensions:
                    parsedMetadata.h !== undefined && parsedMetadata.w !== undefined
                        ? {width: parsedMetadata.w, height: parsedMetadata.h}
                        : undefined,
            } as const;
        } catch (error) {
            log.warn(`Video metadata did not pass validation: ${error}`);

            return {
                type: MessageType.VIDEO,
            } as const;
        }
    } else if (fileData.file.mediaType.startsWith('audio/') && isMediaOrSticker) {
        try {
            const parsedMetadata = RAW_AUDIO_METADATA_SCHEMA.parse(fileData.metadata ?? {});

            return {
                type: MessageType.AUDIO,
                duration: parsedMetadata.d,
            } as const;
        } catch (error) {
            log.warn(`Audio metadata did not pass validation: ${error}`);

            return {
                type: MessageType.AUDIO,
            } as const;
        }
    } else {
        return {
            type: MessageType.FILE,
        } as const;
    }
}

/**
 * Return true if we expect that messages in the specified store might have a thumbnail.
 */
export function messageStoreHasThumbnail(
    messageStore: AnyMessageModelStore,
): messageStore is AnyImageMessageModelStore | AnyVideoMessageModelStore {
    // Note: When adding new variants, make sure to change the return type as well!
    switch (messageStore.type) {
        case 'image':
        case 'video':
            return true;
        case 'text':
        case 'file':
        case 'audio':
            return false;
        default:
            return unreachable(messageStore);
    }
}
