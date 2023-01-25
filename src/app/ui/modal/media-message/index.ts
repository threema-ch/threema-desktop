/**
 * Get file extension name of given filename
 */
export function getFileExtension(filename: string): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const extension = filename.split(/\./u).pop()!;
    return extension.substring(0, 4);
}

export interface MediaFile {
    file: File;
    caption?: string;
}
