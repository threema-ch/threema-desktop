<!--
  @component Renders an avatar picture next to the message passed to `<slot />`.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import Avatar from '~/app/ui/components/atoms/avatar/Avatar.svelte';
  import type {MessageAvatarProviderProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-avatar-provider/props';
  import {i18n} from '~/app/ui/i18n';
  import {ReceiverType} from '~/common/enum';
  import {type IQueryableStore, ReadableStore} from '~/common/utils/store';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.message-avatar-provider');

  type $$Props = MessageAvatarProviderProps;

  export let conversation: $$Props['conversation'];
  export let direction: $$Props['direction'];
  export let sender: $$Props['sender'] = undefined;
  export let services: $$Props['services'];

  const {router} = services;

  let profilePictureStore: IQueryableStore<Blob | undefined> = new ReadableStore(undefined);

  function handleClickAvatar(): void {
    if (sender === undefined) {
      log.error('Clicked avatar when sender was undefined');
      return;
    }
    if (sender.type === 'self') {
      log.error('Sender type is self of clicked avatar');
      return;
    }

    const route = router.get();

    if (route.aside !== undefined) {
      router.go({
        main: ROUTE_DEFINITIONS.main.conversation.withParams({
          receiverLookup: {
            type: ReceiverType.CONTACT,
            uid: sender.uid,
          },
        }),
        aside: ROUTE_DEFINITIONS.aside.receiverDetails.withParams({
          type: ReceiverType.CONTACT,
          uid: sender.uid,
        }),
      });
    } else {
      router.go({
        main: ROUTE_DEFINITIONS.main.conversation.withParams({
          receiverLookup: {
            type: ReceiverType.CONTACT,
            uid: sender.uid,
          },
        }),
      });
    }
  }

  function updateProfilePictureStore(
    conversationValue: typeof conversation,
    senderValue: typeof sender,
    directionValue: typeof direction,
  ): void {
    if (
      conversationValue.receiver.type === 'group' &&
      senderValue !== undefined &&
      directionValue === 'inbound' &&
      senderValue.type !== 'self'
    ) {
      services.profilePicture
        .getProfilePictureForReceiver({
          type: ReceiverType.CONTACT,
          uid: senderValue.uid,
        })
        .then((store) => {
          if (store === undefined) {
            profilePictureStore = new ReadableStore(undefined);
          } else {
            profilePictureStore = store;
          }
        })
        .catch((error: unknown) => {
          log.warn(`Failed to fetch profile picture store: ${error}`);
          profilePictureStore = new ReadableStore(undefined);
        });
    }
  }

  $: updateProfilePictureStore(conversation, sender, direction);
</script>

{#if conversation.receiver.type === 'group' && sender !== undefined && direction === 'inbound'}
  <span class="avatar">
    <Avatar
      byteStore={profilePictureStore}
      color={sender.color}
      description={$i18n.t('contacts.hint--profile-picture', {
        name: sender.name,
      })}
      initials={sender.initials}
      size={24}
      on:click={handleClickAvatar}
    />
  </span>
{/if}

<slot />

<style lang="scss">
  @use 'component' as *;

  .avatar {
    // If this avatar is part of a flex container, prevent it from being resized.
    flex: none;
  }
</style>
