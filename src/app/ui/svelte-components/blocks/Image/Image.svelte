<!--
  @component
  Load and display an image resource.

  To specify fallback content that will be shown until the image data is loaded,
  specify a slot value:

  ```html
  <Image src="https://example.com/image.jpg" alt="An image">
    <img src="loading.gif" alt="Loading...">
    <span slot="error">Uh-oh, image could not be loaded or rendered</span>
  </Image>
  ```

  The `src` property may not be undefined, but you may pass in a promise that
  never resolves (for example with `Promise.race([])`).
-->
<script lang="ts">
  import {onDestroy, tick} from 'svelte';

  import {globals} from '~/app/globals';
  import type {StringOrLiteral} from '~/common/types';
  import {assertUnreachable, ensureError} from '~/common/utils/assert';
  import {isSupportedImageType} from '~/common/utils/image';
  import {AsyncLock} from '~/common/utils/lock';

  const log = globals.unwrap().uiLogging.logger('ui.component.image');

  /**
   * The image resource to render. May also be a promise. Note: Will only be rendered if the media
   * type is valid and whitelisted.
   */
  export let src: Blob | Promise<Blob>;
  /**
   * Sets or retrieves a text alternative to the image.
   */
  export let alt: string;

  let url: StringOrLiteral<'loading' | 'failed'> = 'loading';
  const urlUpdateLock = new AsyncLock();

  function revokeUrl(urlToRevoke: string): void {
    if (urlToRevoke !== 'loading' && urlToRevoke !== 'failed') {
      URL.revokeObjectURL(urlToRevoke);
    }
  }

  async function updateUrl(currentSrc: typeof src): Promise<void> {
    await urlUpdateLock.with(async () => {
      const blob =
        currentSrc instanceof Promise
          ? await currentSrc.catch((error) => {
              log.error(
                `Could not update image url due to an error while loading the blob: ${error}`,
              );

              return undefined;
            })
          : currentSrc;
      const previousUrl = url;

      if (blob === undefined) {
        url = 'failed';
      } else if (!isSupportedImageType(blob.type)) {
        url = 'failed';

        log.error('Image media type is not allowed');
      } else {
        url = URL.createObjectURL(blob);
      }

      revokeUrl(previousUrl);
      await tick();
    });
  }

  $: updateUrl(src).catch(assertUnreachable);

  onDestroy(() => {
    revokeUrl(url);
  });
</script>

<template>
  {#if url === 'loading'}
    <slot />
  {:else if url === 'failed'}
    <!-- Fall back the error slot, then to the default slot. -->
    <slot name="error">
      <slot />
    </slot>
  {:else}
    <img
      src={url}
      {alt}
      on:click
      on:load
      on:error
      on:error={(error) => {
        // Force falling back to the error/default slot.
        src = Promise.reject(ensureError(error));
      }}
      {...$$restProps}
    />
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  img {
    max-width: 100%;
    max-height: 100%;
    width: var(--c-image-width, default);
    height: var(--c-image-height, default);
    object-fit: var(--c-image-object-fit, default);
    border-radius: inherit;
  }
</style>
