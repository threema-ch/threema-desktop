import type {u53} from '@threema/ts-utils/integer/u53';

/**
 * Frames per second the returned stream produces.
 */
const FRAME_RATE = 30;

/**
 * Milliseconds the bar takes to sweep across the picture once.
 */
const SWEEP_DURATION_MS = 4000;

/**
 * Create the function which paints one frame and schedules the next, for as long as the given
 * stream is still running.
 */
function createDrawFrame(
    context: CanvasRenderingContext2D,
    stream: MediaStream,
    picture: {
        readonly gradient: CanvasGradient;
        readonly height: u53;
        readonly width: u53;
    },
): (timestampMs: DOMHighResTimeStamp) => void {
    const {gradient, height, width} = picture;
    const barWidth = Math.round(width / 12);

    function drawFrame(timestampMs: DOMHighResTimeStamp): void {
        // Stops by itself once the consumer stopped the track, so a caller which is done with the
        // stream does not have to unsubscribe from anything.
        if (!stream.active) {
            return;
        }

        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);

        const progress = (timestampMs % SWEEP_DURATION_MS) / SWEEP_DURATION_MS;
        context.fillStyle = 'rgb(255 255 255 / 0.5)';
        context.fillRect(Math.round(progress * (width - barWidth)), 0, barWidth, height);

        requestAnimationFrame(drawFrame);
    }

    return drawFrame;
}

/**
 * Create a {@link MediaStream} with a live video track, for use wherever a real stream is needed
 * without a camera, i.e. in tests and stories. The picture is a gradient with a bar moving across
 * it, so that it is visibly live and visibly asymmetric, which makes mirroring apparent.
 *
 * Note: The stream draws until it is stopped, i.e. until all of its tracks ended.
 *
 * @param dimensions The desired dimensions of the captured picture in pixels.
 * @returns A stream carrying one live video track.
 * @throws {Error} If the platform does not hand over a 2d rendering context.
 */
export function createTestVideoStream(
    dimensions: {readonly height?: u53; readonly width?: u53} = {},
): MediaStream {
    const {height = 480, width = 640} = dimensions;

    const canvas = document.createElement('canvas');
    canvas.height = height;
    canvas.width = width;

    const context = canvas.getContext('2d');
    if (context === null) {
        throw new Error('Could not acquire a 2d rendering context from the canvas');
    }

    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0f766e');
    gradient.addColorStop(1, '#1e1b4b');

    const stream = canvas.captureStream(FRAME_RATE);
    requestAnimationFrame(createDrawFrame(context, stream, {gradient, height, width}));

    return stream;
}
