<script lang="ts">
  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import {
    type TransformedContact,
    getStores,
    showFullNameAndNickname,
    transformContact,
  } from '~/app/ui/nav/contact';
  import DeprecatedReceiver from '~/app/ui/generic/receiver/DeprecatedReceiver.svelte';
  import {type Avatar, type Contact, type RemoteModelFor, type Settings} from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type IdentityString} from '~/common/network/types';
  import {type Remote} from '~/common/utils/endpoint';

  export let member: RemoteModelStore<Contact>;

  export let settings: Remote<Settings>;

  export let creator: IdentityString;

  let avatar: RemoteModelStore<Avatar> | undefined;
  let contact$: TransformedContact | undefined = undefined;

  function resetContactData(): void {
    contact$ = undefined;
    avatar = undefined;
  }

  function loadContactData(c: RemoteModelFor<Contact>): void {
    transformContact(settings, c)
      .then((transformedContact) => {
        contact$ = transformedContact;
        getStores(c)
          .then((stores) => {
            avatar = stores.avatar;
          })
          .catch(resetContactData);
      })
      .catch(resetContactData);
  }

  $: loadContactData($member);
</script>

<template>
  {#if contact$ !== undefined && $avatar !== undefined}
    <DeprecatedReceiver
      on:click
      avatar={{
        alt: `Avatar of ${contact$.displayName}`,
        avatar: $avatar,
        initials: contact$.initials,
        unread: 0,
        badge: contact$.badge,
      }}
      title={{
        title: showFullNameAndNickname(contact$) ? contact$.fullName : contact$.displayName,
        subtitle: showFullNameAndNickname(contact$) ? contact$.nickname : undefined,
        isInactive: contact$.activityState === 'inactive',
        isCreator: creator === contact$.identity,
      }}
    >
      <div class="verification-dots" slot="additional-top">
        <VerificationDots
          colors={contact$.verificationLevelColors}
          verificationLevel={contact$.verificationLevel}
        />
      </div>
      <div class="identity" slot="additional-bottom">{contact$.identity}</div>
    </DeprecatedReceiver>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .verification-dots {
    @include def-var(--c-verification-dots-size, rem(6px));
  }
</style>
