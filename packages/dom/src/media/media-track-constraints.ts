/**
 * Which properties a microphone is asked for.
 *
 * Note: Deliberately empty. The platform applies echo cancellation, noise suppression and gain
 * control by default, and asking for anything more specific tends to exclude devices rather than
 * improve them.
 */
export const MICROPHONE_CONSTRAINTS: MediaTrackConstraints = {};

/**
 * Which properties a camera is asked for.
 *
 * Note: Stated as `ideal` plus `max` rather than `exact`, so that a camera which cannot deliver
 * this is still opened, with whatever it can deliver.
 */
export const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
    width: {ideal: 1280, max: 1280},
    height: {ideal: 960, max: 960},
    frameRate: {ideal: 30, max: 30},
    aspectRatio: {ideal: 4 / 3, max: 16 / 9},
};

/**
 * Which properties a display capture is asked for.
 *
 * Note: A `min` frame rate must not be stated here. No browser implements it for a display capture,
 * and stating it makes the request fail as invalid.
 */
export const DISPLAY_CONSTRAINTS: MediaTrackConstraints = {
    width: {max: 1920},
    height: {max: 1080},
    frameRate: {ideal: 10, max: 10},
};
