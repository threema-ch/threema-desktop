<!--
  @component An improved text input component similar to `<textarea>`, based on the
  `@threema/compose-area` npm package.

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

  import {globals} from '~/app/globals';
  import {mutation} from '~/app/ui/actions/mutation';
  import {size} from '~/app/ui/actions/size';
  import {DEBOUNCE_TIMEOUT_TO_RECOUNT_TEXT_BYTES_MILLIS} from '~/app/ui/components/atoms/textarea/helpers';
  import type {TextAreaProps} from '~/app/ui/components/atoms/textarea/props';
  import type {u32, u53} from '~/common/types';
  import {isNotUndefined, unreachable, unwrap} from '~/common/utils/assert';
  import {WritableStore} from '~/common/utils/store';
  import {getUtf8ByteLength} from '~/common/utils/string';
  import {TIMER} from '~/common/utils/timer';

  const log = globals.unwrap().uiLogging.logger('ui.component.textarea');

  /**
   * Writable store backing {@link isEmpty}, not exposed to other components.
   */
  const isEmptyStore = new WritableStore(true);

  type $$Props = TextAreaProps;

  export let enterKeyMode: NonNullable<$$Props['enterKeyMode']> = 'submit';
  export let initialText: $$Props['initialText'] = undefined;
  export const isEmpty: NonNullable<$$Props['isEmpty']> = isEmptyStore;
  export let placeholder: $$Props['placeholder'];
  export let triggerWords: NonNullable<$$Props['triggerWords']> = [];

  const dispatch = createEventDispatcher<{
    submit: undefined;
    pastefiles: File[];
    textbytelengthdidchange: u53;
    heightwillchange: undefined;
    heightdidchange: undefined;
    istyping: boolean;
  }>();

  let area: ComposeArea;

  // `HTMLElement` of the text area.
  let areaElement: HTMLElement;
  let areaElementHeight: u32 | undefined = undefined;

  // "Spacer" size should mimic the size of the text area.
  let spacerElementHeight: u32 | undefined = undefined;

  // Whether a composition session is active, see:
  // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing.
  let isComposing = false;

  const dispatchIsTyping = TIMER.debounce(
    (isTyping: boolean) => {
      dispatch('istyping', isTyping);
    },
    1000,
    false,
  );

  /**
   * Clears the contents of the text area.
   */
  export function clear(): void {
    area.clear();

    // Because programmatic changes of the compose area don't trigger an input event, we need to
    // manually update the state flags.
    isEmptyStore.set(true);
  }

  /**
   * Focuses the text area.
   */
  export function focus(): void {
    areaElement.focus();
  }

  /**
   * Extracts and returns the current text content of the text area.
   */
  export function getText(): string {
    return area.get_text();
  }

  /**
   * Returns the current byte length of the text area's text content. Note: This operation can be
   * expensive, and should only be used sparingly.
   */
  export function getTextByteLength(): u53 {
    return getUtf8ByteLength(getText());
  }

  /**
   * Inserts additional (plain) text at the current caret position.
   */
  export function insertText(text: string): void {
    area.insert_text(text);
  }

  /**
   * Inserts an arbitrary, non-editable {@link Element} at the current caret position.
   */
  export function insertElement(element: Element): void {
    element.setAttribute('contenteditable', 'false');

    area.select_word_at_caret();
    area.store_selection_range();
    area.insert_node(element);
  }

  function handleChangeSizeAreaElement(event: CustomEvent<{entries: ResizeObserverEntry[]}>): void {
    const height = event.detail.entries[0]?.contentRect.height;

    if (areaElementHeight !== height) {
      requestAnimationFrame(() => {
        areaElementHeight = height;

        dispatch('heightwillchange');
      });
    }
  }

  function handleChangeSizeSpacerElement(
    event: CustomEvent<{entries: ResizeObserverEntry[]}>,
  ): void {
    const height = event.detail.entries[0]?.contentRect.height;

    if (spacerElementHeight !== height) {
      requestAnimationFrame(() => {
        spacerElementHeight = height;

        dispatch('heightdidchange');
      });
    }
  }

  /**
   * Handle input changes in the compose area.
   *
   * The input event is triggered for touch events as well (in contrast to the key events).
   */
  function handleInput(): void {
    self.queueMicrotask(() => {
      // Workaround to avoid recursive access to compose area.
      //
      // TODO(https://github.com/threema-ch/compose-area/issues/97, https://github.com/threema-ch/compose-area/issues/98):
      // Fix this, see this discussion for details:
      // https://git.threema.ch/clients/web/threema-desktop-web/-/merge_requests/92#note_31788
      const currentIsEmpty = area.is_empty();
      isEmptyStore.set(currentIsEmpty);
      dispatchIsTyping(!currentIsEmpty);

      area.store_selection_range();
      const wordAtCaret = area.get_word_at_caret();
      if (wordAtCaret !== undefined) {
        const word = `${wordAtCaret.before()}${wordAtCaret.after()}`;
        for (const matcher of triggerWordsState) {
          if (word.startsWith(matcher.prefix)) {
            // Get current value after the matched trigger word, and invoke the callback.
            const wordWithoutPrefix = word.substring(matcher.prefix.length);
            matcher.onMatch(wordWithoutPrefix);

            // Set `isMatchEndHandled` to `false`, as we are now actively editing around this
            // trigger word.
            matcher.isMatchEndHandled = false;
            triggerWords = triggerWords;
          } else if (!matcher.isMatchEndHandled) {
            // Trigger word doesn't match the current caret location any more, but `isMatchEndHandled`
            // has not been handled yet, so we need to update the state and invoke callbacks.
            matcher.isMatchEndHandled = true;
            triggerWords = triggerWords;

            // Invoke callback.
            matcher.onMatchEnd();
          }
        }
      } else {
        // No word at caret, which means `onMatchEnd` should be called for every matcher which is
        // still active.
        for (const matcher of triggerWordsState) {
          if (!matcher.isMatchEndHandled) {
            matcher.onMatchEnd();
          }
        }
      }
    });
  }

  /**
   * Handle key down event in the compose area.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    // Determine whether or not to submit the text.
    let submit = false;
    switch (enterKeyMode) {
      case 'newline':
        // To submit, we need to type ctrl + enter.
        submit = event.key === 'Enter' && event.ctrlKey;
        break;
      case 'submit':
        // To submit, the enter key must be pressed without shift.
        submit = event.key === 'Enter' && !event.shiftKey;
        break;
      default:
        unreachable(enterKeyMode);
    }

    // Prevent inserting a newline when submitting.
    if (submit) {
      event.preventDefault();
    }

    // If the enter key is part of a composition (e.g. when entering text with an IME),
    // don't submit the text.
    //
    // See https://github.com/threema-ch/threema-web/issues/777 for details.
    if (event.isComposing || isComposing) {
      return;
    }

    // Handle submission.
    if (submit) {
      dispatch('submit');
      dispatch('istyping', false);
    }
  }

  /**
   * Debounced handling of content changes in the compose area.
   */
  const handleMutation = TIMER.debounce(
    () => dispatch('textbytelengthdidchange', getTextByteLength()),
    DEBOUNCE_TIMEOUT_TO_RECOUNT_TEXT_BYTES_MILLIS,
  );

  /**
   * Handle pasting inside compose area.
   */
  function handlePaste(event: ClipboardEvent): void {
    // If no clipboard data is available, do nothing.
    if (event.clipboardData === null) {
      return;
    }

    // Find available types.
    const items: DataTransferItemList = event.clipboardData.items;

    const fileItems: DataTransferItem[] = [];
    let textItem: DataTransferItem | undefined;

    // Note: `DataTransferItemList` does not implement iterator, so for-of is not possible.
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let index = 0; index < items.length; ++index) {
      const item = unwrap(items[index]);
      if (item.kind === 'file') {
        fileItems.push(item);
      } else if (item.kind === 'string' && item.type === 'text/plain') {
        textItem = item;
        break;
      }
    }

    if (textItem !== undefined) {
      const text = event.clipboardData.getData('text/plain');
      // Note: If there is no data for the specified format, text will contain an empty string.
      if (text.length > 0) {
        area.insert_text(text);
      }
      return;
    }

    // Handle pasting of files.
    const pastedFiles = fileItems
      .map((fileItem) => {
        // Read clipboard data as file.
        const file = fileItem.getAsFile();
        if (file === null) {
          log.error(
            `Could not get pasted item as a blob (kind: ${fileItem.kind}, type: ${fileItem.type})`,
          );

          return undefined;
        }

        return file;
      })
      .filter(isNotUndefined);

    dispatch('pastefiles', pastedFiles);
  }

  $: triggerWordsState = triggerWords.map((matcher) => ({
    ...matcher,
    /**
     * Whether the `onMatchEnd` handler has already been called. Note: At the beginning, this is
     * `true` for every trigger word, because the user hasn't typed anything at all yet (which means
     * there is nothing to end).
     */
    isMatchEndHandled: true,
  }));

  onMount(() => {
    // Bind compose area to DOM.
    area = ComposeArea.bind_to(areaElement);

    // Auto-focus on mount.
    focus();

    /**
     * Handle selection change events on the document.
     */
    function handleSelectionChange(): void {
      area.store_selection_range();
    }

    /**
     * Handle composition start event in the compose area.
     */
    function handleCompositionStart(): void {
      isComposing = true;
    }

    /**
     * Handle composition end event in the compose area.
     */
    function handleCompositionEnd(): void {
      isComposing = false;
    }

    // Because insertion into the compose area should work even when there is no selection / focus
    // inside, the library needs to know about *all* selection change events.
    document.addEventListener('selectionchange', handleSelectionChange);

    // Register composition start/end event handlers.
    areaElement.addEventListener('compositionstart', handleCompositionStart);
    areaElement.addEventListener('compositionend', handleCompositionEnd);

    // Load initial text.
    self.queueMicrotask(() => {
      if (initialText !== undefined) {
        area.insert_text(initialText);
      }
    });

    return () => {
      // Deregister composition start/end event handlers.
      areaElement.removeEventListener('compositionstart', handleCompositionStart);
      areaElement.removeEventListener('compositionend', handleCompositionEnd);

      // Deregister selection change event handlers.
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  });
</script>

<div class="container">
  <div
    use:size
    class="spacer"
    style:height={areaElementHeight !== undefined ? `${areaElementHeight}px` : '0'}
    on:changesize={handleChangeSizeSpacerElement}
  />

  <div
    bind:this={areaElement}
    use:mutation={{
      options: {
        subtree: true,
        childList: true,
        characterData: true,
      },
    }}
    use:size
    class="textarea"
    contenteditable="true"
    {placeholder}
    role="textbox"
    tabindex={0}
    on:changesize={handleChangeSizeAreaElement}
    on:input={handleInput}
    on:keydown={handleKeyDown}
    on:mutation={handleMutation}
    on:paste|preventDefault={handlePaste}
  />
</div>

<style lang="scss">
  @use 'component' as *;

  $-vars: (compose-area-max-height);
  $-temp-vars: format-each($-vars, $prefix: --c-t-);

  .container {
    @include def-var($-temp-vars, --c-t-compose-area-max-height, min(50vh, rem(320px)));

    position: relative;
    display: flex;
    align-items: center;
    overflow: hidden;
  }

  .spacer,
  .textarea {
    margin: var(--cc-compose-area-margin);
  }

  .spacer {
    position: relative;
    width: 100%;
    max-height: var($-temp-vars, --c-t-compose-area-max-height);
    box-sizing: content-box;
  }

  .textarea {
    position: absolute;
    height: auto;
    min-height: rem(20px);
    left: 0;
    right: 0;

    outline: 0 solid transparent;
    cursor: text;
    max-height: var($-temp-vars, --c-t-compose-area-max-height);
    overflow-y: auto;
    word-wrap: anywhere;
    overflow-wrap: anywhere;
    white-space: break-spaces;

    -webkit-user-modify: read-write-plaintext-only;

    &:empty::before {
      content: attr(placeholder);
      display: block;
      color: var(--cc-compose-area-placeholder-text-color);
    }
  }
</style>
