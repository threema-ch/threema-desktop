<!--
  @component Renders a context menu for a chat message bubble.
-->
<script lang="ts">
  import {tick} from 'svelte';

  import {globals} from '~/app/globals';
  import {contextmenu} from '~/app/ui/actions/contextmenu';
  import Emoji from '~/app/ui/components/atoms/emoji/Emoji.svelte';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
  import {
    extractHrefFromEventTarget,
    extractSelectedTextFromEventTarget,
    getContextMenuItems,
  } from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-context-menu-provider/helpers';
  import type {MessageContextMenuProviderProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-context-menu-provider/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {AnchorPoint} from '~/app/ui/generic/popover/types';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {SingleUnicodeEmoji} from '~/common/utils/emoji';
  import type {IQueryableStore} from '~/common/utils/store';

  const log = globals.unwrap().uiLogging.logger('ui.component.message.context-menu');

  const {
    boundary,
    caretAnchorName,
    emojiReactions,
    enabledOptions,
    onafterclose,
    onafteropen,
    onbeforeclose,
    onbeforeopen,
    onclickcopyimageoption,
    onclickcopymessageoption,
    onclickdeleteoption,
    onclickeditoption,
    onclickfavoriteemoji,
    onclickforwardoption,
    onclickopendetailsoption,
    onclickopenemojipicker,
    onclickquoteoption,
    onclicksaveasfileoption,
    options = {},
    placement,
    services,
    snippetMessage,
  }: MessageContextMenuProviderProps = $props();

  const skinTonePreferencesStore: IQueryableStore<
    ReadonlyMap<SingleUnicodeEmoji, SingleUnicodeEmoji>
  > = services.emojis.getEmojiSkinTonePreferences();

  const anchorPoints: AnchorPoint =
    placement === 'right'
      ? {
          reference: {
            horizontal: 'left',
            vertical: 'bottom',
          },
          popover: {
            horizontal: 'left',
            vertical: 'top',
          },
        }
      : {
          reference: {
            horizontal: 'right',
            vertical: 'bottom',
          },
          popover: {
            horizontal: 'right',
            vertical: 'top',
          },
        };

  // Important: Make sure the emojis used here are the fully-qualified variants.
  const defaultEmojiReactions = ['👍', '👎', '❤️', '😂', '😮'] as SingleUnicodeEmoji[];

  let popover = $state<SvelteNullableBinding<Popover>>(null);
  let selectedLink = $state<string | undefined>(undefined);
  let selectedText = $state<string | undefined>(undefined);

  function handleBeforeOpen(event?: MouseEvent): void {
    onbeforeopen?.(event);

    selectedLink = undefined;
    selectedText = undefined;

    if (event === undefined) {
      return;
    }

    selectedLink = extractHrefFromEventTarget(event);
    selectedText = extractSelectedTextFromEventTarget(event);
  }

  function handleClickCopyLink(): void {
    popover?.close();

    if (selectedLink !== undefined) {
      navigator.clipboard
        .writeText(selectedLink)
        .then(() =>
          toast.addSimpleSuccess(
            $i18n.t('messaging.success--copy-message-link', 'Link copied to clipboard'),
          ),
        )
        .catch((error: unknown) => {
          log.error('Could not copy link to clipboard', error);
          toast.addSimpleFailure(
            $i18n.t('messaging.error--copy-message-link', 'Could not copy link to clipboard'),
          );
        });
    } else {
      log.warn('Attempting to copy undefined link');
    }
  }

  function handleClickCopySelection(): void {
    popover?.close();

    if (selectedText !== undefined) {
      navigator.clipboard
        .writeText(selectedText)
        .then(() =>
          toast.addSimpleSuccess(
            $i18n.t(
              'messaging.success--copy-message-selection',
              'Selected text copied to clipboard',
            ),
          ),
        )
        .catch((error: unknown) => {
          log.error('Could not copy selected text to clipboard', error);
          toast.addSimpleFailure(
            $i18n.t(
              'messaging.error--copy-message-selection',
              'Could not copy selection to clipboard',
            ),
          );
        });
    } else {
      log.warn('Attempting to copy undefined text selection');
    }
  }

  function handleClickCopyImage(): void {
    popover?.close();
    onclickcopyimageoption?.();
  }

  function handleClickCopy(): void {
    popover?.close();
    onclickcopymessageoption?.();
  }

  function handleClickSaveAsFile(): void {
    popover?.close();
    onclicksaveasfileoption?.();
  }

  function handleClickQuote(): void {
    popover?.close();
    onclickquoteoption?.();
  }

  function handleClickForward(): void {
    popover?.close();
    onclickforwardoption?.();
  }

  function handleClickOpenDetails(): void {
    popover?.close();
    onclickopendetailsoption?.();
  }

  function handleClickDelete(): void {
    popover?.close();
    onclickdeleteoption?.();
  }

  function handleClickEdit(): void {
    popover?.close();
    onclickeditoption?.();
  }

  function handleClickFavoriteEmoji(event: MouseEvent, emoji: SingleUnicodeEmoji): void {
    popover?.close();
    onclickfavoriteemoji?.({rawEvent: event, emoji});
  }

  function handleClickOpenEmojiPicker(event: MouseEvent): void {
    popover?.close();
    onclickopenemojipicker?.(event);
  }

  function handleContextMenuEvent(event: MouseEvent): void {
    if (event.type === 'contextmenu') {
      popover?.open(event);
    }
  }

  const menuItems: readonly ContextMenuItem[] = $derived(
    getContextMenuItems({
      copyLink:
        enabledOptions.copyLink && selectedLink !== undefined ? handleClickCopyLink : undefined,
      copySelection:
        enabledOptions.copySelection && selectedText !== undefined
          ? handleClickCopySelection
          : undefined,
      copyImage: enabledOptions.copyImage ? handleClickCopyImage : undefined,
      copy: enabledOptions.copy ? handleClickCopy : undefined,
      edit:
        enabledOptions.edit === false
          ? undefined
          : {handler: handleClickEdit, disabled: enabledOptions.edit.disabled ? 'pseudo' : false},
      saveAsFile: enabledOptions.saveAsFile ? handleClickSaveAsFile : undefined,
      quote: enabledOptions.quote ? handleClickQuote : undefined,
      forward: enabledOptions.forward ? handleClickForward : undefined,
      openDetails: enabledOptions.openDetails ? handleClickOpenDetails : undefined,
      deleteMessage: enabledOptions.deleteMessage ? handleClickDelete : undefined,
      t: $i18n.t,
    }),
  );

  const defaultEmojiReactionsWithPreferredSkinTone = $derived(
    defaultEmojiReactions.map((emoji) => $skinTonePreferencesStore.get(emoji) ?? emoji),
  );

  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const deps = {boundary, emojiReactions, menuItems, options, placement};

    tick()
      .then(() => {
        popover?.forceReposition();
      })
      .catch((error) => {
        log.error(`Failed to await tick: ${error}`);
      });
  });
</script>

<div class={`container ${placement}`}>
  <div class="message" use:contextmenu={handleContextMenuEvent}>
    {@render snippetMessage?.()}
  </div>

  <ContextMenuProvider
    bind:popover
    {anchorPoints}
    closeOnClickOutside={true}
    container={boundary}
    items={menuItems}
    offset={{left: 0, top: 4}}
    {onafterclose}
    {onafteropen}
    {onbeforeclose}
    onbeforeopen={handleBeforeOpen}
    safetyGap={{
      left: 12,
      right: 12,
      // Account for the `TopBar`.
      top: 64 + 12,
      bottom: 12,
    }}
    triggerBehavior="toggle"
  >
    <button
      class="caret"
      class:visible={options.alwaysShowCaret === true}
      style:anchor-name={caretAnchorName}
    >
      <MdIcon theme="Outlined">expand_more</MdIcon>
    </button>

    {#snippet snippetBefore()}
      <div class="reactions">
        {#if emojiReactions.enabled}
          {#each defaultEmojiReactionsWithPreferredSkinTone as emoji, idx (emoji)}
            {@const active =
              emojiReactions.enabled &&
              emojiReactions.ownReactions.some((ownReaction) => ownReaction.emoji === emoji)}

            <button
              aria-disabled={emojiReactions.enabled && !emojiReactions.fullSupport && idx > 1}
              class="emoji"
              class:active
              onclick={(event) => handleClickFavoriteEmoji(event, emoji)}
            >
              <Emoji unicode={emoji} />
            </button>
          {/each}
          <button
            aria-disabled={!emojiReactions.fullSupport}
            class="add"
            onclick={handleClickOpenEmojiPicker}
          >
            <MdIcon theme="Outlined">add_reaction</MdIcon>
          </button>
        {/if}
      </div>
    {/snippet}
  </ContextMenuProvider>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    align-items: start;
    justify-content: start;
    gap: rem(4px);

    &.left {
      flex-direction: row-reverse;
    }

    .caret {
      --c-icon-font-size: #{rem(24px)};

      @include clicktarget-button-circle;

      & {
        visibility: hidden;
        color: var(--cc-conversation-message-options-caret-color);
        width: rem(24px);
        height: rem(24px);
        cursor: pointer;
        user-select: none;
      }
    }

    &:hover .caret,
    .caret.visible {
      visibility: visible;
    }

    .reactions {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: start;
      gap: rem(2px);

      padding: rem(4px) rem(8px) rem(12px);

      .emoji,
      .add {
        @extend %neutral-input;

        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;

        width: rem(32px);
        height: rem(32px);
        font-size: rem(24px);
        line-height: rem(24px);
        cursor: pointer;
        border-radius: 50%;

        transition: background-color 0.125s ease-out;

        &:hover {
          background-color: var(--cc-emoji-reactions-favorite-box-item-background-color--hover);
        }

        &[aria-disabled='true'] {
          opacity: var(--cc-emoji-reactions-favorite-box-item-opacity--disabled);
        }
      }

      .emoji {
        &.active {
          background-color: var(--cc-emoji-reactions-favorite-box-item-background-color--active);

          &[aria-disabled='true'] {
            cursor: default;
          }

          &:hover:not([aria-disabled='true']) {
            background-color: var(
              --cc-emoji-reactions-favorite-box-item-background-color--active--hover
            );
          }
        }
      }

      .add {
        font-size: rem(18px);
        line-height: rem(18px);
        padding-top: rem(2px);
      }
    }
  }
</style>
