<script lang="ts">
  import {onDestroy} from 'svelte';

  import Receiver from '~/app/ui/generic/receiver/Receiver.svelte';
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
  let transformedContact: TransformedContact | undefined;
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
    <Receiver
      receiver={{
        type: 'contact',
        verificationDot: {
          color: transformedContact.verificationLevelColors,
          level: transformedContact.verificationLevel,
        },
        identity: transformedContact.identity,
        isBlocked,
        profilePicture: {
          alt: $i18n.t('contacts.hint--profile-picture', {
            name: transformedContact.displayName,
          }),
          profilePicture: $profilePicture.view,
          initials: transformedContact.initials,
          unread: 0,
          badge: transformedContact.badge,
        },
        title: {
          text: showFullNameAndNickname(transformedContact)
            ? transformedContact.fullName
            : transformedContact.displayName,
        },
        subtitle: {
          text: showFullNameAndNickname(transformedContact)
            ? transformedContact.nickname
            : undefined,
          badges: {
            isInactive: transformedContact.activityState === 'inactive',
            isInvalid: transformedContact.activityState === 'invalid',
            isCreator: creator === transformedContact.identity,
          },
        },
      }}
      on:click
    ></Receiver>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;
</style>
