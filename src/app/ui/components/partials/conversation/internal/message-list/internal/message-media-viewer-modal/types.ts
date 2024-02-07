/**
 * States used to describe the progress when loading the media.
 */
export type MediaState =
    | {readonly status: 'loading'}
    | {
          readonly status: 'failed';
          readonly localizedReason?: string;
      }
    | LoadedImageState
    | LoadedVideoState;

/**
 * State describing a loaded image.
 */
export interface LoadedImageState {
    readonly status: 'loaded';
    readonly type: 'image';
    readonly url: string;
}

/**
 * State describing a loaded video.
 */
export interface LoadedVideoState {
    readonly status: 'loaded';
    readonly type: 'video';
    readonly url: string;
}
