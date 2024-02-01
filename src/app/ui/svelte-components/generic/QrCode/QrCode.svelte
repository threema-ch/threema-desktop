<script lang="ts">
  import type * as qr from 'qrcode';

  import {drawToCanvas} from '.';

  /**
   * Data to be encoded.
   */
  export let data: string | Uint8Array;

  /**
   * Encoding options for drawing the QR code.
   */
  export let options: qr.QRCodeRenderersOptions | undefined = undefined;

  // The canvas to draw the QR code on
  let canvas: HTMLCanvasElement | null = null;

  $: if (canvas !== null) {
    void drawToCanvas(canvas, data, options);
  }
</script>

<canvas bind:this={canvas} />
