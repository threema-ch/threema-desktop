import type {ReadonlyUint8Array, f64} from '~/common/types';

/**
 * Props accepted by the `AudioPlayer` component.
 */
export interface AudioPlayerProps {
    /**
     * Duration of the audio track.
     */
    readonly duration?: f64;
    /**
     * Function to fetch the audio data with.
     */
    readonly fetchAudio: () => Promise<ReadonlyUint8Array | undefined>;
    readonly onError: (error: Error) => void;
}
