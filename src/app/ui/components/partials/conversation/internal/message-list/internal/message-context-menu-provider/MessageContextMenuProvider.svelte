<!--
  @component
  Renders a context menu for a chat message bubble.
-->
<script lang="ts">
  import {afterUpdate, createEventDispatcher} from 'svelte';

  import {globals} from '~/app/globals';
  import {contextmenu} from '~/app/ui/actions/contextmenu';
  import ContextMenuProvider from '~/app/ui/components/hocs/context-menu-provider/ContextMenuProvider.svelte';
  import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
  import {
    extractHrefFromEventTarget,
    extractSelectedTextFromEventTarget,
    getContextMenuItems,
  } from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-context-menu-provider/helpers';
  import type {MessageContextMenuProviderProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-context-menu-provider/props';
  import type Popover from '~/app/ui/generic/popover/Popover.svelte';
  import type {AnchorPoint, VirtualRect} from '~/app/ui/generic/popover/types';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  const log = globals.unwrap().uiLogging.logger('ui.component.message.context-menu');

  type $$Props = MessageContextMenuProviderProps;

  export let boundary: $$Props['boundary'] = undefined;
  export let enabledOptions: $$Props['enabledOptions'];
  export let placement: $$Props['placement'];

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

  let popover: SvelteNullableBinding<Popover> = null;
  let virtualTrigger: VirtualRect | undefined = undefined;

  let selectedLink: string | undefined = undefined;
  let selectedText: string | undefined = undefined;

  const dispatch = createEventDispatcher<{
    clickcopyimageoption: undefined;
    clickcopymessageoption: undefined;
    clickeditoption: undefined;
    clicksaveasfileoption: undefined;
    clickacknowledgeoption: undefined;
    clickdeclineoption: undefined;
    clickquoteoption: undefined;
    clickforwardoption: undefined;
    clickopendetailsoption: undefined;
    clickdeleteoption: undefined;
  }>();

  function handleBeforeOpen(event?: MouseEvent): void {
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
            i18n.get().t('messaging.success--copy-message-link', 'Link copied to clipboard'),
          ),
        )
        .catch((error: unknown) => {
          log.error('Could not copy link to clipboard', error);
          toast.addSimpleFailure(
            i18n.get().t('messaging.error--copy-message-link', 'Could not copy link to clipboard'),
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
            i18n
              .get()
              .t('messaging.success--copy-message-selection', 'Selected text copied to clipboard'),
          ),
        )
        .catch((error: unknown) => {
          log.error('Could not copy selected text to clipboard', error);
          toast.addSimpleFailure(
            i18n
              .get()
              .t(
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
    dispatch('clickcopyimageoption');
  }

  function handleClickCopy(): void {
    popover?.close();
    dispatch('clickcopymessageoption');
  }

  function handleClickSaveAsFile(): void {
    popover?.close();
    dispatch('clicksaveasfileoption');
  }

  function handleClickAcknowledge(): void {
    popover?.close();
    dispatch('clickacknowledgeoption');
  }

  function handleClickDecline(): void {
    popover?.close();
    dispatch('clickdeclineoption');
  }

  function handleClickQuote(): void {
    popover?.close();
    dispatch('clickquoteoption');
  }

  function handleClickForward(): void {
    popover?.close();
    dispatch('clickforwardoption');
  }

  function handleClickOpenDetails(): void {
    popover?.close();
    dispatch('clickopendetailsoption');
  }

  function handleClickDelete(): void {
    popover?.close();
    dispatch('clickdeleteoption');
  }

  function handleClickEdit(): void {
    popover?.close();
    dispatch('clickeditoption');
  }

  function handleClickTrigger(): void {
    virtualTrigger = undefined;
  }

  function handleContextMenuEvent(event: MouseEvent): void {
    if (event.type === 'contextmenu') {
      virtualTrigger = {
        width: 0,
        height: 0,
        left: event.clientX,
        right: 0,
        top: event.clientY,
        bottom: 0,
      };

      popover?.open(event);
    } else {
      virtualTrigger = undefined;
    }
  }

  let menuItems: Readonly<ContextMenuItem[]>;
  $: menuItems = getContextMenuItems({
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
    acknowledge:
      enabledOptions.acknowledge === false
        ? undefined
        : {
            filled: enabledOptions.acknowledge.used,
            handler: handleClickAcknowledge,
          },
    decline:
      enabledOptions.decline === false
        ? undefined
        : {
            filled: enabledOptions.decline.used,
            handler: handleClickDecline,
          },
    quote: enabledOptions.quote ? handleClickQuote : undefined,
    forward: enabledOptions.forward ? handleClickForward : undefined,
    openDetails: enabledOptions.openDetails ? handleClickOpenDetails : undefined,
    deleteMessage: enabledOptions.deleteMessage ? handleClickDelete : undefined,
    t: $i18n.t,
  });

  afterUpdate(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    popover?.forceReposition();
  });
</script>

<div class={`container ${placement}`}>
  <div class="message" use:contextmenu={handleContextMenuEvent}>
    <slot name="message" />
  </div>

  <ContextMenuProvider
    bind:popover
    {anchorPoints}
    beforeOpen={handleBeforeOpen}
    closeOnClickOutside={true}
    container={boundary}
    items={menuItems}
    offset={{left: 0, top: 4}}
    reference={virtualTrigger}
    safetyGap={{
      left: 12,
      right: 12,
      // Account for the `TopBar`.
      top: 64 + 12,
      bottom: 12,
    }}
    triggerBehavior={virtualTrigger === undefined ? 'toggle' : 'open'}
    on:clicktrigger={handleClickTrigger}
    on:hasclosed
    on:hasopened
    on:willclose
    on:willopen
  >
    <button class="caret">
      <MdIcon theme="Outlined">expand_more</MdIcon>
    </button>
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
      @include clicktarget-button-circle;
      --c-icon-font-size: #{rem(24px)};
      visibility: hidden;
      color: var(--cc-conversation-message-options-caret-color);
      width: rem(24px);
      height: rem(24px);
      cursor: pointer;
      user-select: none;
    }

    &:hover .caret {
      visibility: visible;
    }
  }
</style>
