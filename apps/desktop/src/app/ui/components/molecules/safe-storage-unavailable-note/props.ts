import type {SafeStorageUnavailableReason} from '~/common/electron-ipc';

/**
 * Props accepted by the `SafeStorageUnavailableNote` component.
 */
export interface SafeStorageUnavailableNoteProps {
    /**
     * Why secure storage is unavailable. Determines the text of the note.
     */
    readonly reason: SafeStorageUnavailableReason;
}
