<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {safedrag} from '~/app/ui/actions/drag';
  import type {DropZoneProviderProps} from '~/app/ui/components/hocs/drop-zone-provider/props';
  import {type FileLoadResult, validateFiles} from '~/app/ui/utils/file';

  type $$Props = DropZoneProviderProps;

  export let overlay: $$Props['overlay'] = undefined;

  const dispatch = createEventDispatcher<{
    dropfiles: FileLoadResult;
  }>();

  let isDragOver = false;

  async function handleDrop(event: DragEvent): Promise<void> {
    event.preventDefault();

    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles === undefined) {
      return;
    }

    const result = await validateFiles(droppedFiles);

    dispatch('dropfiles', result);
  }
</script>

<!-- Disable `no-static-element-interactions` warning, because accessible alternatives (e.g., a
button) for adding files should always be used in conjunction with `DropZoneProvider`. -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="dropzone"
  use:safedrag
  on:safedragenter={() => {
    if (overlay !== undefined) {
      isDragOver = true;
    }
  }}
  on:safedragleave={() => {
    isDragOver = false;
  }}
  on:dragover|preventDefault
  on:drop={handleDrop}
>
  {#if overlay !== undefined}
    <div class="overlay" class:active={isDragOver}>
      <div class="highlight">
        {overlay.message}
      </div>
    </div>
  {/if}

  <slot />
</div>

<style lang="scss">
  @use 'component' as *;

  .dropzone {
    position: relative;
    overflow: inherit;

    .overlay {
      z-index: $z-index-global-overlay;
      pointer-events: none;
      position: absolute;
      display: none;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      padding: rem(8px);
      background-color: var(--t-main-background-color);

      &.active {
        display: block;
      }

      .highlight {
        @extend %font-h5-400;

        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        border-radius: rem(8px);
        border: rem(2px) solid var(--cc-drop-zone-provider-border-color);
        background-color: var(--cc-drop-zone-provider-background-color);
      }
    }
  }
</style>
