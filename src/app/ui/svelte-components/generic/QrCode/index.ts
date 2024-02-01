import * as qr from 'qrcode';

/**
 * Draw a QR code onto a canvas.
 *
 * @param canvas Element the QR code should be drawn on.
 * @param data Data to encode into the QR code.
 * @param options Encoding options.
 */
export async function drawToCanvas(
    canvas: HTMLCanvasElement,
    data: string | Uint8Array,
    options?: qr.QRCodeRenderersOptions,
): Promise<void> {
    let input: string | qr.QRCodeByteSegment[];
    if (data instanceof Uint8Array) {
        input = [{mode: 'byte', data}];
    } else {
        input = data;
    }
    await qr.toCanvas(canvas, input, options);
}
