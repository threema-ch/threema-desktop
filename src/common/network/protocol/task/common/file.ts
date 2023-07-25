import {ImageRenderingType, MessageType} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {type CommonFileMessageInit} from '~/common/model/types/message/file';
import {type CommonImageMessageInit} from '~/common/model/types/message/image';
import {
    type FileJson,
    RAW_IMAGE_METADATA_SCHEMA,
} from '~/common/network/structbuf/validate/csp/e2e/file';
import {unreachable} from '~/common/utils/assert';

/**
 * Determines the extra properties from a file message.
 */
export function getFileBasedMessageTypeAndExtraProperties(
    fileData: FileJson,
    log: Logger,
):
    | Pick<CommonFileMessageInit, 'type'>
    | Pick<CommonImageMessageInit, 'type' | 'renderingType' | 'animated' | 'dimensions'> {
    if (
        fileData.file.mediaType.startsWith('image/') &&
        (fileData.renderingType === 'media' || fileData.renderingType === 'sticker')
    ) {
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
    } else {
        return {
            type: MessageType.FILE,
        } as const;
    }
}