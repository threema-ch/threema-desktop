import {ImageType} from '~/common/enum';

/**
 * If the specified media type is a supported image media type, return the corresponding
 * {@link ImageType}. Otherwise, return undefined.
 */
export function mediaTypeToImageType(mediaType: string): ImageType | undefined {
    switch (mediaType) {
        case 'image/jpeg':
            return ImageType.JPEG;
        case 'image/png':
            return ImageType.PNG;
        case 'image/gif':
            return ImageType.GIF;
        case 'image/webp':
            return ImageType.WEBP;
        case 'image/avif':
            return ImageType.AVIF;
        default:
            return undefined;
    }
}

/**
 * Return whether or not the specified media type is a supported image media type.
 */
export function isSupportedImageType(mediaType: string): boolean {
    return mediaTypeToImageType(mediaType) !== undefined;
}
