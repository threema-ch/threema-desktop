<script lang="ts">
  import {createEventDispatcher, onDestroy, onMount, tick} from 'svelte';
  import type {Readable} from 'svelte/store';

  import {globals} from '~/app/globals';
  import {clickoutside} from '~/app/ui/actions/clickoutside';
  import TextArea from '~/app/ui/components/atoms/textarea/TextArea.svelte';
  import EmojiPicker from '~/app/ui/components/molecules/emoji-picker/EmojiPicker.svelte';
  import type {ComposeBarProps} from '~/app/ui/components/partials/conversation/internal/compose-bar/props';
  import Mention from '~/app/ui/components/partials/mention/Mention.svelte';
  import type {MentionProps} from '~/app/ui/components/partials/mention/props';
  import {i18n} from '~/app/ui/i18n';
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import FileTrigger from '~/app/ui/svelte-components/blocks/FileTrigger/FileTrigger.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {FileResult} from '~/app/ui/svelte-components/utils/filelist';
  import {nodeIsOrContainsTarget} from '~/app/ui/utils/node';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {u53} from '~/common/types';
  import {assertUnreachable} from '~/common/utils/assert';
  import type {SingleUnicodeEmoji} from '~/common/utils/emoji';

  const hotkeyManager = globals.unwrap().hotkeyManager;

  type $$Props = ComposeBarProps;

  export let services: $$Props['services'];
  export let mode: NonNullable<$$Props>['mode'] = 'insert';
  export let options: NonNullable<$$Props['options']> = {};
  export let triggerWords: $$Props['triggerWords'] = undefined;
  export let onPaste: $$Props['onPaste'] = undefined;
  export let enterKeyMode: NonNullable<$$Props>['enterKeyMode'] = 'submit';

  const dispatch = createEventDispatcher<{
    attachfiles: FileResult;
    clicksend: string;
    clickapplyedit: string;
    istyping: boolean;
  }>();

  let emojiPickerComponent: SvelteNullableBinding<EmojiPicker> = null;
  let emojiButtonElement: SvelteNullableBinding<HTMLDivElement> = null;
  let isEmojiPickerVisible = false;

  let textAreaComponent: SvelteNullableBinding<TextArea> = null;
  let isTextAreaEmpty: Readable<boolean>;
  let textAreaByteLength: u53;

  /**
   * Insert text content into the compose area at the current caret position.
   */
  export function insertText(text: string): void {
    textAreaComponent?.insertText(text);
  }

  /**
   * Get current text content of the compose area.
   */
  export function getText(): string | undefined {
    return textAreaComponent?.getText();
  }

  /**
   * Clear the compose area's text content.
   */
  export function clear(): void {
    textAreaComponent?.clear();
  }

  /**
   * Focuses the text area.
   */
  export function focus(): void {
    textAreaComponent?.focus();
  }

  /**
   * Insert mention label into the compose area at the current caret position.
   */
  export function insertMention(mention: MentionProps['mention']): void {
    const element = document.createElement('span');

    // eslint-disable-next-line no-new
    new Mention({
      target: element,
      props: {mention},
    });

    textAreaComponent?.insertElement(element);
  }

  /**
   * Insert a `SingleUnicodeEmoji` replacing the current word.
   */
  export function insertInlineEmoji(emoji: SingleUnicodeEmoji): void {
    textAreaComponent?.replaceCurrentWord(emoji);
  }

  function handleAttachFiles(event: CustomEvent<FileResult>): void {
    dispatch('istyping', true);
    dispatch('attachfiles', event.detail);
  }

  function handleClickEmojiButton(): void {
    toggleEmojiPicker();
  }

  async function handleClickSendButton(): Promise<void> {
    dispatch('istyping', false);
    textAreaByteLength = textAreaComponent?.getTextByteLength() ?? 0;

    // Prevent sending if message is too long.
    if (textAreaByteLength > import.meta.env.MAX_TEXT_MESSAGE_BYTES) {
      return;
    }

    const textAreaTextContent = textAreaComponent?.getText();
    if (textAreaTextContent !== undefined) {
      if (mode === 'insert') {
        dispatch('clicksend', textAreaTextContent);
      } else {
        dispatch('clickapplyedit', textAreaTextContent);
      }
    }

    // Close the emoji picker and wait for DOM changes to be applied.
    closeEmojiPicker();
    await tick();

    // Reset text area content.
    textAreaComponent?.clear();
  }

  function handleClickOutsideEmojiPicker(event: MouseEvent): void {
    if (!nodeIsOrContainsTarget(emojiButtonElement, event.target)) {
      closeEmojiPicker();
    }
  }

  function handleChangeTextByteLength(event: CustomEvent<u53>): void {
    textAreaByteLength = event.detail;
  }

  function handleIsTyping(event: CustomEvent<boolean>): void {
    if (mode === 'insert') {
      dispatch('istyping', event.detail);
    }
  }

  function handlePressHotkeyControlE(): void {
    toggleEmojiPicker();
  }

  function handleSelectEmoji(emoji: SingleUnicodeEmoji): void {
    textAreaComponent?.insertText(emoji);
  }

  async function openEmojiPicker(): Promise<void> {
    isEmojiPickerVisible = true;

    await tick();
    emojiPickerComponent?.focusSearchBar();
  }

  function closeEmojiPicker(): void {
    emojiPickerComponent?.blurSearchBar();
    isEmojiPickerVisible = false;
    emojiPickerComponent?.clearSearchTerm();
    emojiPickerComponent?.scrollTo({behavior: 'instant', top: 0});
  }

  function toggleEmojiPicker(): void {
    if (isEmojiPickerVisible) {
      closeEmojiPicker();
    } else {
      openEmojiPicker().catch(assertUnreachable);
    }
  }

  $: showAttachFilesButton = options.showAttachFilesButton ?? true;
  $: isTextByteLengthVisible = textAreaByteLength >= import.meta.env.MAX_TEXT_MESSAGE_BYTES - 200;
  $: isMaxTextByteLengthExceeded = textAreaByteLength > import.meta.env.MAX_TEXT_MESSAGE_BYTES;

  onMount(() => {
    hotkeyManager.registerHotkey({control: true, code: 'KeyE'}, handlePressHotkeyControlE);
  });

  onDestroy(() => {
    hotkeyManager.unregisterHotkey(handlePressHotkeyControlE);
  });
</script>

<div class="container">
  <div class="left">
    {#if showAttachFilesButton}
      <FileTrigger on:fileDrop={handleAttachFiles} multiple>
        <IconButton flavor="naked">
          <MdIcon theme="Outlined">attach_file</MdIcon>
        </IconButton>
      </FileTrigger>
    {/if}
  </div>

  <div class="center">
    <!-- A11y is not handled here, as it's already possible to focus the `TextArea` by just tabbing
    into it. This workaround to make the clickable area larger is specific to mouse-based input
    methods. -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="composearea" on:click={() => textAreaComponent?.focus()}>
      <TextArea
        {services}
        bind:this={textAreaComponent}
        bind:isEmpty={isTextAreaEmpty}
        placeholder={$i18n.t('messaging.label--compose-area', 'Write a message...')}
        {triggerWords}
        {onPaste}
        {enterKeyMode}
        on:pastefiles
        on:submit={handleClickSendButton}
        on:textbytelengthdidchange={handleChangeTextByteLength}
        on:istyping={handleIsTyping}
      />
    </div>
  </div>

  <div class="right">
    {#if isTextByteLengthVisible}
      <div class="bytes-count" class:exceeded={isMaxTextByteLengthExceeded}>
        {textAreaByteLength}/{import.meta.env.MAX_TEXT_MESSAGE_BYTES}
      </div>
    {/if}

    <div bind:this={emojiButtonElement}>
      <IconButton flavor="naked" on:click={handleClickEmojiButton}>
        <MdIcon theme="Outlined">insert_emoticon</MdIcon>
      </IconButton>
    </div>

    {#if !$isTextAreaEmpty || options.allowEmptyMessages === true}
      <IconButton
        flavor="filled"
        on:click={handleClickSendButton}
        disabled={isMaxTextByteLengthExceeded}
      >
        <MdIcon theme="Filled">{mode === 'insert' ? 'arrow_upward' : 'check'}</MdIcon>
      </IconButton>
    {/if}

    <div
      use:clickoutside={{enabled: isEmojiPickerVisible}}
      class="emoji-picker"
      data-is-visible={isEmojiPickerVisible}
      on:clickoutside={({detail: {event}}) => {
        handleClickOutsideEmojiPicker(event);
      }}
    >
      <EmojiPicker
        bind:this={emojiPickerComponent}
        id="compose-bar"
        {services}
        onSelectEmoji={handleSelectEmoji}
      />
    </div>
  </div>
</div>

<style lang="scss">
  @use 'component' as *;

  @mixin emoji-picker--hidden {
    opacity: 0;
    box-shadow: var(--cc-emoji-picker-popover-box-shadow--hidden);
    transform: translate3d(0, 16px, 0) scale3d(0.99, 0.99, 0.99);
  }

  @mixin emoji-picker--visible {
    opacity: 1;
    box-shadow: var(--cc-emoji-picker-popover-box-shadow--visible);
  }

  .container {
    position: relative;
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    padding-inline: rem(8px);

    .left,
    .right {
      flex: none;
      display: flex;
      align-items: center;
      padding-block: rem(12px);
    }

    .left {
      justify-content: left;
    }

    .center {
      flex: 1 1 0;

      .composearea,
      .composearea :global(> .container) {
        width: 100%;
        height: 100%;
      }

      .composearea:hover {
        cursor: text;
      }
    }

    .right {
      position: relative;
      justify-content: right;

      .bytes-count {
        display: flex;
        place-items: center;

        &.exceeded {
          color: var(--cc-compose-bar-bytes-count-exceeded-color);
        }
      }
    }

    .emoji-picker {
      // Keep transition always prepared, because this could change often.
      will-change: box-shadow, opacity, transform;
      transition:
        box-shadow 0.2s ease-out,
        opacity 0.05s ease-out,
        transform 0.15s cubic-bezier(0.05, 0.75, 0.55, 1.35),
        display 0.2s linear allow-discrete;

      position: absolute;
      z-index: $z-index-modal;
      bottom: calc(100% + rem(12px));

      height: rem(300px);
      width: rem(280px);
      padding: rem(12px) rem(12px) rem(0px);
      background-color: var(--cc-emoji-picker-popover-background-color);
      backdrop-filter: blur(25px);
      border-radius: rem(8px);

      // Use `@layer` rule to make this block less specific than the `:global` block further down
      // below.
      @layer {
        &[data-is-visible='true'] {
          visibility: visible;
          @include emoji-picker--visible;
        }
      }

      &[data-is-visible='false'] {
        visibility: hidden;
        @include emoji-picker--hidden;
      }
    }
  }

  // TODO(DESK-1367): Try to move the `@starting-style` out of `:global`, and see whether the entry
  // and exit transitions still work. Wrapping the visible styles using the `@layer` rule (above) is
  // probably also not necessary anymore. This is currently needed because Svelte doesn't know this
  // rule yet and would strip it otherwise. This should be fixed in Svelte 5, however. See:
  // https://github.com/sveltejs/svelte/issues/9267.
  :global(.container .emoji-picker[data-is-visible='true']) {
    @starting-style {
      @include emoji-picker--hidden;
    }
  }
</style>
