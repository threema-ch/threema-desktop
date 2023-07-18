import {type MessageType} from '~/common/enum';
import {type OutboundFileMessage} from '~/common/model/types/message/file';
import {type OutboundImageMessage} from '~/common/model/types/message/image';
import {type u53} from '~/common/types';
import {unreachable, unwrap} from '~/common/utils/assert';
import {bytesToHex} from '~/common/utils/byte';
import {purgeUndefinedProperties} from '~/common/utils/object';

/**
 * Based on the specified message, generate the file message JSON data (as defined in the CSP file
 * message specification).
 */
export function getFileJsonData(
    // Note: Using an inline type instead of a store to make testing easier.
    message:
        | {type: MessageType.FILE; view: OutboundFileMessage['view']}
        | {type: MessageType.IMAGE; view: OutboundImageMessage['view']},
): Record<string, unknown> {
    // Extract blob IDs
    const blobId = unwrap(message.view.blobId, 'Tried to send file based message without blob ID');
    const thumbnailBlobId = message.view.thumbnailBlobId;

    // Extract rendering type and metadata based on file type
    let renderingType: u53;
    let deprecatedRenderingType: u53;
    let metadata;
    switch (message.type) {
        case 'file':
            renderingType = deprecatedRenderingType = 0; // File
            metadata = undefined;
            break;
        case 'image':
            renderingType = message.view.renderingType; // Image or sticker
            deprecatedRenderingType = 1;
            metadata = purgeUndefinedProperties({
                a: message.view.animated,
                h: message.view.dimensions?.height,
                w: message.view.dimensions?.width,
            });
            break;
        default:
            unreachable(message);
    }

    return purgeUndefinedProperties({
        j: renderingType, // Rendering type
        i: deprecatedRenderingType, // Deprecated rendering type for compatibility
        k: bytesToHex(message.view.encryptionKey.unwrap()), // Blob encryption key
        b: bytesToHex(blobId), // File blob ID
        m: message.view.mediaType, // File media type
        n: message.view.fileName, // File name
        s: message.view.fileSize, // File size in bytes
        t: thumbnailBlobId === undefined ? undefined : bytesToHex(thumbnailBlobId), // Blob containing the thumbnail file data
        p: message.view.thumbnailMediaType, // Media type of the thumbnail
        d: message.view.caption, // Caption text
        c: message.view.correlationId, // Correlation ID
        x: metadata, // Metadata
    });
}
