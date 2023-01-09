<script lang="ts">
  import MessageContact from '~/app/ui/main/conversation/conversation-messages/MessageContact.svelte';
  import MessageContent from '~/app/ui/main/conversation/conversation-messages/MessageContent.svelte';
  import {type Remote} from '~/common/utils/endpoint';
  import {type LocalStore} from '~/common/utils/store';
  import {type ConversationMessage} from '~/common/viewmodel/conversation-messages';

  /**
   * The message to be parsed and displayed with the requested features.
   */
  export let quote: Remote<LocalStore<ConversationMessage>>;
</script>

<template>
  <div class="quote" data-color={$quote.body.sender.profilePicture.color}>
    <div class="contact">
      <MessageContact
        name={$quote.body.sender.name}
        color={$quote.body.sender.profilePicture.color}
      />
    </div>
    <div class="content">
      <MessageContent message={$quote.body} mentions={$quote.mentions} isQuoted={true} />
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
