import type {f64} from '~/common/types';
import type {FileBytesAndMediaType} from '~/common/utils/file';

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
    readonly fetchAudio: () => Promise<FileBytesAndMediaType | undefined>;
    readonly onError: (error: Error) => void;
}
