<!--
  @component
  Renders an image whose bytes might be provided later, or a placeholder.
-->
<script lang="ts">
  import {onDestroy} from 'svelte';

  import {globals} from '~/app/globals';
  import {constrain} from '~/app/ui/components/atoms/lazy-image/constrain';
  import type {LazyImageProps} from '~/app/ui/components/atoms/lazy-image/props';
  import type {LazyImageContent} from '~/app/ui/components/atoms/lazy-image/types';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';
  import {isSupportedImageType} from '~/common/utils/image';

  const log = globals.unwrap().uiLogging.logger('ui.component.lazy-image');

  type $$Props = LazyImageProps;

  export let byteStore: $$Props['byteStore'];
  export let constraints: $$Props['constraints'];
  export let description: $$Props['description'];
  export let dimensions: $$Props['dimensions'] = undefined;
  export let isClickable: NonNullable<$$Props['isClickable']> = false;
  export let isFocusable: NonNullable<$$Props['isFocusable']> = false;
  export let responsive: NonNullable<$$Props['responsive']> = false;

  let image: LazyImageContent = {
    state: 'loading',
  };

  async function updateContent(value: 'loading' | Blob | undefined): Promise<void> {
    revokeCurrentImageUrl(image);

    if (value === 'loading') {
      image = {state: 'loading'};
      return;
    }

    if (value === undefined) {
      image = {state: 'failed'};
      return;
    }

    // At this point it's certain that `value` is a `Blob`.
    const blob: Blob = value;

    // If the blob is an unsupported image type (e.g., an SVG), don't render it at all.
    if (!isSupportedImageType(blob.type)) {
      image = {state: 'failed'};
      return;
    }

    try {
      const imageBitmap = await createImageBitmap(blob);

      revokeCurrentImageUrl(image);
      image = {
        state: 'loaded',
        url: URL.createObjectURL(blob),
        dimensions: {
          width: imageBitmap.width,
          height: imageBitmap.height,
        },
      };
      imageBitmap.close();
    } catch (error) {
      // Creating bitmap from blob failed, e.g., if the blob's media type didn't match its actual
      // content.
      log.warn(
        `Creating bitmap of type ${blob.type} from ${blob.size}-byte blob failed. Wrong media type or corrupted bytes?`,
      );
      image = {state: 'failed'};
    }
  }

  function revokeCurrentImageUrl(currentImage: LazyImageContent): void {
    if (image.state === 'loaded') {
      URL.revokeObjectURL(image.url);
    }
  }

  $: preferredDisplay = constrain({
    dimensions: image.state === 'loaded' ? image.dimensions : (dimensions ?? {width: 0, height: 0}),
    constraints,
  });
  $: preferredAspectRatio = `${preferredDisplay.values.width} / ${preferredDisplay.values.height}`;

  $: updateContent($byteStore).catch(assertUnreachable);

  onDestroy(() => {
    revokeCurrentImageUrl(image);
  });
</script>

<button
  class={`image ${image.state}`}
  class:clickable={isClickable}
  class:responsive
  style={`--c-t-image-aspect-ratio: ${preferredAspectRatio};
          --c-t-image-min-width: ${constraints.min.width}px;
          --c-t-image-min-height: ${constraints.min.height}px;
          --c-t-image-width: ${preferredDisplay.values.width}px;
          --c-t-image-height: ${preferredDisplay.values.height}px;
          --c-t-image-max-width: ${constraints.max.width}px;
          --c-t-image-max-height: ${constraints.max.height}px`}
  disabled={!isClickable}
  tabindex={isFocusable ? 0 : -1}
  on:click
>
  {#if image.state === 'loading'}
    <slot name="loading">
      <span class="placeholder" />
    </slot>
  {:else if image.state === 'loaded'}
    <img class:cover={!preferredDisplay.isAspectRatioObeyed} src={image.url} alt={description} />
  {:else if image.state === 'failed'}
    <slot name="failed">
      <span class="placeholder cover failed">
        <MdIcon theme="Filled">broken_image</MdIcon>
      </span>
    </slot>
  {:else}
    {unreachable(image)}
  {/if}
</button>

<style lang="scss">
  @use 'component' as *;

  $-vars: (
    image-aspect-ratio,
    image-min-width,
    image-min-height,
    image-width,
    image-height,
    image-max-width,
    image-max-height
  );
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  .image {
    @extend %neutral-input;

    display: inline-flex;
    margin: 0;
    padding: 0;
    width: auto;

    // Reset bottom gap.
    vertical-align: middle;

    &.clickable {
      cursor: pointer;
    }

    img,
    .placeholder,
    &.loading :global(> :first-child),
    &.failed :global(> :first-child) {
      flex: 1;
      vertical-align: middle;

      aspect-ratio: var($-temp-vars, --c-t-image-aspect-ratio);

      width: var($-temp-vars, --c-t-image-width);
      height: auto;
      max-width: var($-temp-vars, --c-t-image-max-width);
      max-height: var($-temp-vars, --c-t-image-max-height);

      display: inline-block;
      background-color: var(--mc-message-image-placeholder-background-color);

      object-fit: contain;
      object-position: center;

      &.cover {
        object-fit: cover;
      }
    }

    .placeholder.failed,
    &.failed :global(> :first-child) {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: rem(24px);
    }

    &.responsive {
      img,
      .placeholder,
      &.loading :global(> :first-child),
      &.failed :global(> :first-child) {
        max-width: min(var($-temp-vars, --c-t-image-max-width), 100%);
        max-height: min(var($-temp-vars, --c-t-image-max-height), 100%);
      }
    }
  }
</style>
