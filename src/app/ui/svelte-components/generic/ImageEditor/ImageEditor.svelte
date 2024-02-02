<script lang="ts">
  import Croppie from 'croppie';
  import {onDestroy, onMount} from 'svelte';
  import {fade} from 'svelte/transition';

  import {unwrap} from '~/app/ui/svelte-components/utils/assert';
  import {UrlSource} from '~/app/ui/svelte-components/utils/url';

  /**
   * The address or URL of an image resource. May also be a promise.
   */
  export let src: string | Blob | Promise<string | Blob>;

  // The image source transformed into a URL source
  const url = new UrlSource(onDestroy);

  // HTML elements to bind to
  let container: HTMLElement | null = null;
  let editor: Croppie | undefined;

  /**
   * Return the result in form of the canvas for further processing or
   * exporting.
   */
  export async function result(): Promise<HTMLCanvasElement> {
    return await unwrap(editor).result({
      type: 'rawcanvas',
    });
  }

  onMount((): void => {
    const container_ = unwrap(container);

    // Attach editor to the wrapper element
    editor = new Croppie(container_, {
      viewport: {
        width: container_.offsetWidth,
        height: container_.offsetHeight,
        type: 'square',
      },
      showZoomer: true,
    });
  });

  /**
   * Load and bind the image source to the editor.
   */
  async function load(item: {src: string | Blob | Promise<string | Blob>}): Promise<void> {
    await unwrap(editor).bind({
      url: await url.load(item.src),
    });
  }

  // Update input image source on the editor
  $: if (editor !== undefined) {
    void load({src});
  }
</script>

<template>
  <div in:fade bind:this={container} />
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    width: 100%;
    height: 100%;
  }

  :global(.croppie-container) {
    width: 100%;
    height: 100%;
  }

  :global(.croppie-container .cr-image) {
    z-index: $z-index-minus;
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: 0 0;
    max-height: none;
    max-width: none;
  }

  :global(.croppie-container .cr-boundary) {
    position: relative;
    overflow: hidden;
    margin: 0 auto;
    z-index: $z-index-plus;
    width: 100%;
    height: 100%;
  }

  :global(.croppie-container .cr-viewport),
  :global(.croppie-container .cr-resizer) {
    position: absolute;
    margin: auto;
    top: 0;
    bottom: 0;
    right: 0;
    left: 0;
    box-shadow: 0 0 2000px 2000px rgba(0, 0, 0, 0.5);
    z-index: $z-index-zero;
  }

  :global(.croppie-container .cr-resizer) {
    z-index: 2;
    box-shadow: none;
    pointer-events: none;
  }

  :global(.croppie-container .cr-resizer-vertical),
  :global(.croppie-container .cr-resizer-horisontal) {
    position: absolute;
    pointer-events: all;
  }

  :global(.croppie-container .cr-resizer-vertical::after),
  :global(.croppie-container .cr-resizer-horisontal::after) {
    display: block;
    position: absolute;
    box-sizing: border-box;
    border: 1px solid black;
    background: #fff;
    width: 10px;
    height: 10px;
    content: '';
  }

  :global(.croppie-container .cr-resizer-vertical) {
    bottom: -5px;
    cursor: row-resize;
    width: 100%;
    height: 10px;
  }

  :global(.croppie-container .cr-resizer-vertical::after) {
    left: 50%;
    margin-left: -5px;
  }

  :global(.croppie-container .cr-resizer-horisontal) {
    right: -5px;
    cursor: col-resize;
    width: 10px;
    height: 100%;
  }

  :global(.croppie-container .cr-resizer-horisontal::after) {
    top: 50%;
    margin-top: -5px;
  }

  :global(.croppie-container .cr-original-image) {
    display: none;
  }

  :global(.croppie-container .cr-vp-circle) {
    border-radius: 50%;
  }

  :global(.croppie-container .cr-overlay) {
    z-index: $z-index-plus;
    position: absolute;
    cursor: move;
    touch-action: none;
  }

  :global(.croppie-container .cr-slider-wrap) {
    width: 75%;
    margin: 15px auto;
    text-align: center;
  }

  :global(.croppie-result) {
    position: relative;
    overflow: hidden;
  }

  :global(.croppie-result img) {
    position: absolute;
  }

  :global(.croppie-container .cr-image),
  :global(.croppie-container .cr-overlay),
  :global(.croppie-container .cr-viewport) {
    -webkit-transform: translateZ(0);
    -moz-transform: translateZ(0);
    -ms-transform: translateZ(0);
    transform: translateZ(0);
  }

  /*************************************/
  /***** STYLING RANGE INPUT ***********/
  /*************************************/
  /*http://brennaobrien.com/blog/2014/05/style-input-type-range-in-every-browser.html */
  /*************************************/

  :global(.cr-slider) {
    -webkit-appearance: none;
    /*removes default webkit styles*/
    /*border: 1px solid white; */ /*fix for FF unable to apply focus style bug */
    width: 300px;
    /*required for proper track sizing in FF*/
    max-width: 100%;
    padding-top: 8px;
    padding-bottom: 8px;
    background-color: transparent;
  }

  :global(.cr-slider::-webkit-slider-runnable-track) {
    width: 100%;
    height: 3px;
    background: rgba(0, 0, 0, 0.5);
    border: 0;
    border-radius: 3px;
  }

  :global(.cr-slider::-webkit-slider-thumb) {
    -webkit-appearance: none;
    border: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #ddd;
    margin-top: -6px;
  }

  :global(.cr-slider:focus) {
    outline: none;
  }
  /*
:global(.cr-slider:focus::-webkit-slider-runnable-track) {
background: #ccc;
}
*/

  :global(.cr-slider::-moz-range-track) {
    width: 100%;
    height: 3px;
    background: rgba(0, 0, 0, 0.5);
    border: 0;
    border-radius: 3px;
  }

  :global(.cr-slider::-moz-range-thumb) {
    border: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #ddd;
    margin-top: -6px;
  }

  /*hide the outline behind the border*/
  :global(.cr-slider:-moz-focusring) {
    outline: 1px solid white;
    outline-offset: -1px;
  }

  :global(.cr-slider::-ms-track) {
    width: 100%;
    height: 5px;
    background: transparent;
    /*remove bg colour from the track, we'll use ms-fill-lower and ms-fill-upper instead */
    border-color: transparent; /*leave room for the larger thumb to overflow with a transparent border */
    border-width: 6px 0;
    color: transparent; /*remove default tick marks*/
  }
  :global(.cr-slider::-ms-fill-lower) {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
  }
  :global(.cr-slider::-ms-fill-upper) {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
  }
  :global(.cr-slider::-ms-thumb) {
    border: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #ddd;
    margin-top: 1px;
  }
  :global(.cr-slider:focus::-ms-fill-lower) {
    background: rgba(0, 0, 0, 0.5);
  }
  :global(.cr-slider:focus::-ms-fill-upper) {
    background: rgba(0, 0, 0, 0.5);
  }
  /*******************************************/

  /***********************************/
  /* Rotation Tools */
  /***********************************/
  :global(.cr-rotate-controls) {
    position: absolute;
    bottom: 5px;
    left: 5px;
    z-index: $z-index-plus;
  }
  :global(.cr-rotate-controls button) {
    border: 0;
    background: none;
  }
  :global(.cr-rotate-controls i:before) {
    display: inline-block;
    font-style: normal;
    font-weight: 900;
    font-size: 22px;
  }
  :global(.cr-rotate-l i:before) {
    content: '↺';
  }
  :global(.cr-rotate-r i:before) {
    content: '↻';
  }
</style>
