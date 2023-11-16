<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import MenuContainer from '#3sc/components/generic/Menu/MenuContainer.svelte';
  import MenuItem from '#3sc/components/generic/Menu/MenuItem.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {ConversationVisibility} from '~/common/enum';

  export let isConversationEmptyActionEnabled = false;
  export let conversationVisibility: ConversationVisibility;

  const dispatchEvent = createEventDispatcher<{
    emptyConversationActionClicked: undefined;
    setConversationVisibility: ConversationVisibility;
  }>();

  function closeMenuAndDispatchEvent(eventName: 'emptyConversationActionClicked'): () => void {
    return () => {
      dispatchEvent(eventName);
    };
  }

  function dispatchVisibilityEvent(
    eventName: 'setConversationVisibility',
    newConversationVisibility: ConversationVisibility,
  ): () => void {
    return () => {
      dispatchEvent(eventName, newConversationVisibility);
    };
  }
</script>

<template>
  <div>
    <MenuContainer mode="small">
      <MenuItem
        disabled={!isConversationEmptyActionEnabled}
        on:click={closeMenuAndDispatchEvent('emptyConversationActionClicked')}
      >
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined">delete_sweep</MdIcon>
        </span>
        <span>{$i18n.t('messaging.action--empty-conversation', 'Empty Chat')}</span>
      </MenuItem>
      <MenuItem
        on:click={dispatchVisibilityEvent(
          'setConversationVisibility',
          conversationVisibility === ConversationVisibility.PINNED
            ? ConversationVisibility.SHOW
            : ConversationVisibility.PINNED,
        )}
      >
        <span class="icon" slot="icon">
          <MdIcon theme={'Outlined'}>push_pin</MdIcon>
        </span>
        {conversationVisibility === ConversationVisibility.PINNED
          ? $i18n.t('messaging.action--conversation-option-unpin', 'Unpin')
          : $i18n.t('messaging.action--conversation-option-pin', 'Pin')}
      </MenuItem>
      <MenuItem
        on:click={dispatchVisibilityEvent(
          'setConversationVisibility',
          conversationVisibility === ConversationVisibility.ARCHIVED
            ? ConversationVisibility.SHOW
            : ConversationVisibility.ARCHIVED,
        )}
      >
        <span class="icon" slot="icon">
          <MdIcon theme="Outlined"
            >{conversationVisibility === ConversationVisibility.ARCHIVED
              ? 'unarchive'
              : 'archive'}</MdIcon
          >
        </span>
        {conversationVisibility === ConversationVisibility.ARCHIVED
          ? $i18n.t('messaging.action--conversation-option-unarchive', 'Unarchive')
          : $i18n.t('messaging.action--conversation-option-archive', 'Archive')}
      </MenuItem>
    </MenuContainer>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    --c-menu-container-min-width: #{rem(180px)};
    @extend %elevation-060;
  }

  .icon {
    position: relative;
    bottom: -2px;
  }
</style>
