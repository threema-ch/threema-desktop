<script lang="ts">
  import {onDestroy} from 'svelte';

  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import BlockedIcon from '~/app/ui/generic/icon/BlockedIcon.svelte';
  import DeprecatedReceiver from '~/app/ui/generic/receiver/DeprecatedReceiver.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {
    getStores,
    showFullNameAndNickname,
    transformContact,
    type TransformedContact,
  } from '~/app/ui/nav/receiver';
  import type {BackendController} from '~/common/dom/backend/controller';
  import type {Contact, ProfilePicture} from '~/common/model';
  import type {RemoteModelStore} from '~/common/model/utils/model-store';
  import type {IdentityString} from '~/common/network/types';
  import type {StoreUnsubscriber} from '~/common/utils/store';

  export let backend: BackendController;

  export let member: RemoteModelStore<Contact>;

  export let creator: IdentityString;

  let profilePicture: RemoteModelStore<ProfilePicture> | undefined;
  let transformedContact: TransformedContact | undefined = undefined;
  let isBlocked = false;

  function resetContactData(): void {
    transformedContact = undefined;
    profilePicture = undefined;
    isBlocked = false;
  }

  // TODO(DESK-830): Refactor this into the ViewModel.
  const unsubscribers: StoreUnsubscriber[] = [];
  $: transformContact(backend, $member)
    .then((c) => {
      transformedContact = c;
      unsubscribers.push(
        c.isBlocked.subscribe((isBlockedPromise) => {
          isBlockedPromise
            .then((b) => {
              isBlocked = b;
            })
            .catch(resetContactData);
        }),
      );
      getStores($member)
        .then((stores) => {
          profilePicture = stores.profilePicture;
        })
        .catch(resetContactData);
    })
    .catch(resetContactData);
  onDestroy(() => {
    for (const unsubscriber of unsubscribers) {
      unsubscriber();
    }
  });
</script>

<template>
  {#if transformedContact !== undefined && $profilePicture !== undefined}
    <DeprecatedReceiver
      on:click
      profilePicture={{
        alt: $i18n.t('contacts.hint--profile-picture', {
          name: transformedContact.displayName,
        }),
        profilePicture: $profilePicture.view,
        initials: transformedContact.initials,
        unread: 0,
        badge: transformedContact.badge,
      }}
      title={{
        title: showFullNameAndNickname(transformedContact)
          ? transformedContact.fullName
          : transformedContact.displayName,
        subtitle: showFullNameAndNickname(transformedContact)
          ? transformedContact.nickname
          : undefined,
        isInactive: transformedContact.activityState === 'inactive',
        isCreator: creator === transformedContact.identity,
      }}
    >
      <div class="verification-dots" slot="additional-top">
        <VerificationDots
          colors={transformedContact.verificationLevelColors}
          verificationLevel={transformedContact.verificationLevel}
        />
      </div>
      <div class="identity" slot="additional-bottom">
        {#if isBlocked}
          <span class="property" data-property="blocked">
            <BlockedIcon />
          </span>
        {/if}
        {transformedContact.identity}
      </div>
    </DeprecatedReceiver>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .verification-dots {
    @include def-var(--c-verification-dots-size, rem(6px));
  }

  [data-property='blocked'] {
    position: relative;
    top: rem(2px);
  }
</style>
