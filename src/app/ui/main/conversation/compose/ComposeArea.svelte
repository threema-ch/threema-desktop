<!--
  @component The content-editable compose area based on the `@threema/compose-area` npm package.

  ## General Concepts

  Our compose area must support rich content. This includes things like emoji, where an image or
  another HTML snippet is inserted. Often the compose area can also contain nested sub-elements,
  browsers are very unpredictable in this regard.

  Thus, we can't just bind to the "textContent" or "innerHTML" values. Instead, whe use the
  `get_text`-method on the compose area, which traverses the contained DOM elements recursively and
  returns the properly extracted text content.

  For efficiency reasons, we don't always read the full text on every input change. Instead, the
  `get_text` method should only be called if we actually need that text. For toggling UI elements
  when the compose area is empty or non-empty, we use the more efficient `is_empty` method. Changes
  to the emptiness will be signaled using a store.
-->
<script lang="ts">
  import {ComposeArea} from '@threema/compose-area/web';
  import {createEventDispatcher, onMount} from 'svelte';
  import {type Readable} from 'svelte/store';

  import {unreachable} from '~/common/utils/assert';
  import {WritableStore} from '~/common/utils/store';

  import {type ComposeAreaEnterKeyMode} from '.';

  /**
   * Placeholder text of the content editable.
   */
  export let placeholder: string | undefined = 'Write a message...';

  /**
   * Enter key mode.
   */
  export let enterKeyMode: ComposeAreaEnterKeyMode = 'submit';

  /**
   * Initial text that will be used to initialize the compose area.
   */
  export let initialText: string | undefined;

  /**
   * Writable store backing {@link isEmpty}, not exposed to other components.
   */
  const isEmpty_ = new WritableStore(true);

  /**
   * Whether or not the compose area is currently empty.
   */
  export const isEmpty: Readable<boolean> = isEmpty_;

  /**
   * Return the current text content of the compose area.
   */
  export function getText(): string {
    return area.get_text();
  }

  /**
   * Insert more text content into the compose area
   */
  export function insertText(text: string): void {
    area.insert_text(text);
  }

  /**
   * Clear the contents of the compose area.
   */
  export function clearText(): void {
    area.clear();

    // Because programmatic changes of the compose area don't trigger an input event, we need to
    // manually update the state flags.
    isEmpty_.set(true);
  }

  /**
   * Focus wrapper div
   */
  export function focus(): void {
    wrapperDiv.focus();
  }

  // Component event dispatcher
  const dispatch = createEventDispatcher<{submit: undefined}>();

  // Compose area container
  let wrapperDiv: HTMLElement;

  // Compose area instance
  let area: ComposeArea;

  // Composition state flags
  let isComposing = false;

  /**
   * Handle input changes in the compose area.
   *
   * The input event is triggered for touch events as well (in contrast to the key events).
   */
  function onInput(): void {
    self.queueMicrotask(() => {
      // Workaround to avoid recursive access to compose area.
      //
      // TODO(https://github.com/threema-ch/compose-area/issues/97,
      //      https://github.com/threema-ch/compose-area/issues/98): Fix this, see this discussion for details:
      //       https://git.threema.ch/clients/web/threema-desktop-web/-/merge_requests/92#note_31788
      isEmpty_.set(area.is_empty());
    });
  }

  /**
   * Handle key down event in the compose area.
   */
  function onKeyDown(ev: KeyboardEvent): void {
    // Determine whether or not to submit the text
    let submit = false;
    switch (enterKeyMode) {
      case 'newline':
        // To submit, we need to type ctrl+enter
        submit = ev.key === 'Enter' && ev.ctrlKey;
        break;
      case 'submit':
        // To submit, the enter key must be pressed without shift
        submit = ev.key === 'Enter' && !ev.shiftKey;
        break;
      default:
        unreachable(enterKeyMode);
    }

    // Prevent inserting a newline when submitting
    if (submit) {
      ev.preventDefault();
    }

    // If the enter key is part of a composition (e.g. when entering text with an IME),
    // don't submit the text.
    //
    // See https://github.com/threema-ch/threema-web/issues/777 for details.
    if (ev.isComposing || isComposing) {
      return;
    }

    // Handle submission
    if (submit) {
      dispatch('submit');
    }
  }

  /**
   * Handle pasting inside compose area.
   */
  function onPaste(ev: ClipboardEvent): void {
    // If no clipboard data is available, do nothing
    if (ev.clipboardData === null) {
      return;
    }

    // Find available types
    const items: DataTransferItemList = ev.clipboardData.items;
    let fileItem: DataTransferItem | undefined;
    let textItem: DataTransferItem | undefined;
    // Note: Unfortunately `DataTransferItemList` not implement iterator, so for-of is not possible
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (
        item.kind === 'file' &&
        (item.type.includes('image/') || item.type === 'application/x-moz-file')
      ) {
        fileItem = item;
        break;
      } else if (item.kind === 'string' && item.type === 'text/plain') {
        textItem = item;
        break;
      }
    }

    // Handle pasting of files
    if (fileItem !== undefined) {
      // TODO(DESK-318). Note: For reading file data from clipboard event, look at Threema Web.
    } else if (textItem !== undefined) {
      const text = ev.clipboardData.getData('text/plain');
      // Note: If there is no data for the specified format, text will contain an empty string.
      if (text.length > 0) {
        area.insert_text(text);
      }
    }
  }

  onMount(() => {
    // Bind compose area to DOM
    area = ComposeArea.bind_to(wrapperDiv);

    // Auto focus on mount
    focus();

    /**
     * Handle selection change events on the document.
     */
    function onDocumentSelectionChange(): void {
      area.store_selection_range();
    }

    /**
     * Handle composition start event in the compose area.
     */
    function onCompositionStart(): void {
      isComposing = true;
    }

    /**
     * Handle composition end event in the compose area.
     */
    function onCompositionEnd(): void {
      isComposing = false;
    }

    // Because insertion into the compose area should work even when there is no selection / focus
    // inside, the library needs to know about *all* selection change events.
    document.addEventListener('selectionchange', onDocumentSelectionChange);

    // Register composition start/end event handlers
    // Note: Svelte does not support these events natively yet...
    wrapperDiv.addEventListener('compositionstart', onCompositionStart);
    wrapperDiv.addEventListener('compositionend', onCompositionEnd);

    // Load initial text
    if (initialText !== undefined) {
      area.insert_text(initialText);
    }

    return () => {
      // Deregister composition start/end event handlers
      wrapperDiv.removeEventListener('compositionstart', onCompositionStart);
      wrapperDiv.removeEventListener('compositionend', onCompositionEnd);

      // Deregister selection change event handlers
      document.removeEventListener('selectionchange', onDocumentSelectionChange);
    };
  });
</script>

<template>
  <div
    contenteditable="true"
    {placeholder}
    on:input={onInput}
    on:keydown={onKeyDown}
    on:paste|preventDefault={onPaste}
    bind:this={wrapperDiv}
  />
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    outline: 0 solid transparent;
    cursor: text;
    max-height: rem(100px);
    overflow-y: scroll;
    padding: rem(10px) rem(8px) 0 rem(8px);
    margin-bottom: rem(8px);
    display: grid;
    align-items: end;
    word-wrap: anywhere;
    overflow-wrap: anywhere;
    white-space: break-spaces;

    &:empty::before {
      content: attr(placeholder);
      display: block;
      color: var(--cc-compose-area-placeholder-text-color);
    }
  }
</style>
