<script lang="ts">
  import {createEventDispatcher} from 'svelte/internal';

  import {dragEvents} from '~/app/ui/svelte-components/utils/dragdrop';
  import {type FileResult, validateFileList} from '~/app/ui/svelte-components/utils/filelist';

  export let zoneHover = false;

  interface $$Events {
    fileDrop: CustomEvent<FileResult>;
  }

  type Dispatcher<TEvents extends Record<keyof TEvents, CustomEvent>> = {
    [Property in keyof TEvents]: TEvents[Property]['detail'];
  };

  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();

  async function handleDrop(event: DragEvent): Promise<void> {
    // Handle nested dropzones
    if (event.defaultPrevented) {
      return;
    }

    const fileList = event.dataTransfer?.files;
    if (fileList === undefined) {
      return;
    }

    event.preventDefault();

    const fileResult = await validateFileList(fileList);
    dispatch('fileDrop', fileResult);
  }
</script>

<template>
  <div
    on:drop={handleDrop}
    on:dragover|preventDefault
    use:dragEvents
    on:threemadragstart={() => {
      zoneHover = true;
    }}
    on:threemadragend={() => {
      zoneHover = false;
    }}
  >
    <slot />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    display: contents;
    overflow: auto;
  }
</style>
