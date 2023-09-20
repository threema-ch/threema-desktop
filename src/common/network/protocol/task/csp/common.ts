import {type OutboundAudioMessage} from '~/common/model/types/message/audio';
import {type OutboundFileMessage} from '~/common/model/types/message/file';
import {type OutboundImageMessage} from '~/common/model/types/message/image';
import {type OutboundVideoMessage} from '~/common/model/types/message/video';
import {type u53} from '~/common/types';
import {unreachable, unwrap} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {filterUndefinedProperties} from '~/common/utils/object';

/**
 * Based on the specified message, generate the file message JSON data (as defined in the CSP file
 * message specification).
 */
export function getFileJsonData<
    TMessageModel extends
        | Pick<OutboundFileMessage['model'], 'type' | 'view'>
        | Pick<OutboundImageMessage['model'], 'type' | 'view'>
        | Pick<OutboundVideoMessage['model'], 'type' | 'view'>
        | Pick<OutboundAudioMessage['model'], 'type' | 'view'>,
>(message: TMessageModel): Record<string, unknown> {
    const {type, view} = message;

    // Extract blob IDs
    const blobId = unwrap(view.blobId, 'Tried to send file based message without blob ID');
    const thumbnailBlobId = view.thumbnailBlobId;

    // Extract rendering type and metadata based on file type
    let renderingType: u53;
    let deprecatedRenderingType: u53;
    let metadata;
    switch (type) {
        case 'file':
            renderingType = deprecatedRenderingType = 0; // File
            metadata = undefined;
            break;
        case 'image':
            renderingType = view.renderingType; // Image or sticker
            deprecatedRenderingType = 1;
            metadata = filterUndefinedProperties({
                a: view.animated,
                h: view.dimensions?.height,
                w: view.dimensions?.width,
            });
            break;
        case 'video':
            renderingType = deprecatedRenderingType = 1; // Media
            metadata = filterUndefinedProperties({
                d: view.duration,
                h: view.dimensions?.height,
                w: view.dimensions?.width,
            });
            break;
        case 'audio':
            renderingType = deprecatedRenderingType = 1; // Media
            metadata = filterUndefinedProperties({
                d: view.duration,
            });
            break;
        default:
            unreachable(message);
    }

    return filterUndefinedProperties({
        j: renderingType, // Rendering type
        i: deprecatedRenderingType, // Deprecated rendering type for compatibility
        k: bytesToHex(view.encryptionKey.unwrap()), // Blob encryption key
        b: bytesToHex(blobId), // File blob ID
        m: view.mediaType, // File media type
        n: view.fileName, // File name
        s: view.fileSize, // File size in bytes
        t: thumbnailBlobId === undefined ? undefined : bytesToHex(thumbnailBlobId), // Blob containing the thumbnail file data
        p: view.thumbnailMediaType, // Media type of the thumbnail
        d: view.caption, // Caption text
        c: view.correlationId, // Correlation ID
        x: metadata, // Metadata
    });
}
