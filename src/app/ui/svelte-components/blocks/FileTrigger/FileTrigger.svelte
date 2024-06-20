<!--
  @component Open a file upload dialog and trigger a custom fileDrop event.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {type FileResult, validateFileList} from '~/app/ui/svelte-components/utils/filelist';
  import {unwrap} from '~/common/utils/assert';

  /**
   * Optional file type filter, comma-separated list of unique file type specifiers
   * (see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#unique_file_type_specifiers).
   */
  export let accept = '';
  /**
   * Whether to accept multiple files.
   */
  export let multiple = false;

  let fileInput: HTMLInputElement | null = null;
  let form: HTMLFormElement | null = null;

  interface $$Events {
    fileDrop: CustomEvent<FileResult>;
  }

  type Dispatcher<TEvents extends Record<keyof TEvents, CustomEvent>> = {
    [Property in keyof TEvents]: TEvents[Property]['detail'];
  };

  const dispatch = createEventDispatcher<Dispatcher<$$Events>>();

  function triggerFile(): void {
    fileInput?.click();
  }

  async function handleFiles(): Promise<void> {
    const fileList = unwrap(fileInput).files;
    if (fileList === null) {
      return;
    }

    const fileResult = await validateFileList(fileList);
    dispatch('fileDrop', fileResult);

    form?.reset();
  }
</script>

<button on:click={triggerFile} style:display="inline-block">
  <slot />

  <form bind:this={form}>
    <input
      style:display="none"
      bind:this={fileInput}
      type="file"
      {accept}
      {multiple}
      on:input={handleFiles}
    />
  </form>
</button>

<style lang="scss">
  @use 'component' as *;

  button {
    @extend %neutral-input;
  }
</style>
