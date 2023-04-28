<script lang="ts">
  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import DeprecatedReceiver from '~/app/ui/generic/receiver/DeprecatedReceiver.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {
    getStores,
    showFullNameAndNickname,
    transformContact,
    type TransformedContact,
  } from '~/app/ui/nav/receiver';
  import {
    type Contact,
    type ProfilePicture,
    type RemoteModelFor,
    type Settings,
  } from '~/common/model';
  import {type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type IdentityString} from '~/common/network/types';
  import {type Remote} from '~/common/utils/endpoint';

  export let member: RemoteModelStore<Contact>;

  export let settings: Remote<Settings>;

  export let creator: IdentityString;

  let profilePicture: RemoteModelStore<ProfilePicture> | undefined;
  let contact$: TransformedContact | undefined = undefined;

  function resetContactData(): void {
    contact$ = undefined;
    profilePicture = undefined;
  }

  function loadContactData(c: RemoteModelFor<Contact>): void {
    transformContact(settings, c)
      .then((transformedContact) => {
        contact$ = transformedContact;
        getStores(c)
          .then((stores) => {
            profilePicture = stores.profilePicture;
          })
          .catch(resetContactData);
      })
      .catch(resetContactData);
  }

  $: loadContactData($member);
</script>

<template>
  {#if contact$ !== undefined && $profilePicture !== undefined}
    <DeprecatedReceiver
      on:click
      profilePicture={{
        alt: $i18n.t('contacts.hint--profile-picture', {
          name: contact$.displayName,
        }),
        profilePicture: $profilePicture.view,
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
