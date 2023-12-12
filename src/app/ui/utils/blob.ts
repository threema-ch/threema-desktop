/**
 * Determine if a {@link Blob} is accessible (i.e., can be read from the filesystem).
 *
 * One example for a situation in which this would fail is if a file is not accessible by the
 * application, e.g. due to access rights or sandboxing. Access is tested by partially reading the
 * {@link ReadableStream} of the `blob`.
 *
 * @param blob The blob to test access for.
 * @returns Whether the blob can be accessed.
 */
export async function isBlobAccessible(blob: Blob): Promise<boolean> {
    const reader = blob.stream().getReader();

    try {
        await reader.read();
        await reader.cancel();
    } catch (error) {
        return false;
    }

    return true;
}
