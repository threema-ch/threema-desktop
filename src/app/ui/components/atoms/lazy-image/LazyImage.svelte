<!--
  @component
  Renders an image whose bytes might be provided later, or a placeholder.
-->
<script lang="ts">
  import {onDestroy} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {constrain} from '~/app/ui/components/atoms/lazy-image/constrain';
  import type {LazyImageProps} from '~/app/ui/components/atoms/lazy-image/props';
  import type {LazyImageContent} from '~/app/ui/components/atoms/lazy-image/types';
  import type {ReadonlyUint8Array} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = LazyImageProps;

  export let byteStore: $$Props['byteStore'];
  export let constraints: $$Props['constraints'];
  export let description: $$Props['description'];
  export let dimensions: $$Props['dimensions'] = undefined;
  export let disabled: NonNullable<$$Props['disabled']> = true;
  export let responsive: NonNullable<$$Props['responsive']> = false;

  let image: LazyImageContent = {
    state: 'loading',
  };

  async function updateContent(
    value: 'loading' | Blob | ReadonlyUint8Array | undefined,
  ): Promise<void> {
    revokeCurrentImageUrl(image);

    if (value === 'loading') {
      image = {state: 'loading'};
      return;
    }

    if (value === undefined) {
      image = {state: 'failed'};
      return;
    }

    let blob: Blob;
    if (value instanceof Blob) {
      blob = value;
    } else {
      blob = new Blob([value]);
    }

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
  }

  function revokeCurrentImageUrl(currentImage: LazyImageContent): void {
    if (image.state === 'loaded') {
      URL.revokeObjectURL(image.url);
    }
  }

  $: preferredDisplay = constrain({
    dimensions: image.state === 'loaded' ? image.dimensions : dimensions ?? {width: 0, height: 0},
    constraints,
  });
  $: preferredAspectRatio = `${preferredDisplay.values.width} / ${preferredDisplay.values.height}`;

  $: void updateContent($byteStore);

  onDestroy(() => {
    revokeCurrentImageUrl(image);
  });
</script>

<button
  class={`image ${image.state}`}
  class:clickable={!disabled}
  style={`--c-t-image-aspect-ratio: ${preferredAspectRatio};
          --c-t-image-min-width: ${constraints.min.width}px;
          --c-t-image-min-height: ${constraints.min.height}px;
          --c-t-image-width: ${preferredDisplay.values.width}px;
          --c-t-image-height: ${preferredDisplay.values.height}px;
          --c-t-image-max-width: ${responsive ? `100%` : `${constraints.max.width}px`};
          --c-t-image-max-height: ${responsive ? `100%` : `${constraints.max.height}px`};`}
  {disabled}
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
      <span class="placeholder failed">
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

      width: min(var($-temp-vars, --c-t-image-width), var($-temp-vars, --c-t-image-max-width));
      height: min(var($-temp-vars, --c-t-image-height), var($-temp-vars, --c-t-image-max-height));
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
  }
</style>
