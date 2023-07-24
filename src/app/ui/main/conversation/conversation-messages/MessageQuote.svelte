<script lang="ts">
  import MessageContact from '~/app/ui/main/conversation/conversation-messages/MessageContact.svelte';
  import MessageContent from '~/app/ui/main/conversation/conversation-messages/MessageContent.svelte';
  import {type Remote} from '~/common/utils/endpoint';
  import {
    type ConversationMessageViewModelBundle,
    type ConversationMessageViewModelStore,
  } from '~/common/viewmodel/conversation-message';

  export let viewModelBundle: Remote<ConversationMessageViewModelBundle>;

  let viewModelStore: Remote<ConversationMessageViewModelStore>;
  $: viewModelStore = viewModelBundle.viewModel;
</script>

<template>
  <div class="quote" data-color={$viewModelStore.body.sender.profilePicture.color}>
    <div class="contact">
      <MessageContact
        name={$viewModelStore.body.sender.name}
        color={$viewModelStore.body.sender.profilePicture.color}
      />
    </div>
    <div class="content">
      <MessageContent
        messageViewModelController={viewModelBundle.viewModelController}
        isQuoted={true}
        message={$viewModelStore.body}
        mentions={$viewModelStore.mentions}
      />
    </div>
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .quote {
    padding: 0 rem(8px);
  }

  .content {
    padding: rem(2px) 0 0 0;
  }

  @each $color in map-get-req($config, profile-picture-colors) {
    .quote[data-color='#{$color}'] {
      .contact {
        color: var(--c-profile-picture-initials-#{$color}, default);
      }

      border-left: solid
        var(--mc-message-quote-border-width)
        var(--c-profile-picture-initials-#{$color}, default);
    }
  }
</style>
