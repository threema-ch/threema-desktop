<script lang="ts">
  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import DeprecatedReceiver from '~/app/ui/generic/receiver/DeprecatedReceiver.svelte';
  import ProcessedText from '~/app/ui/generic/receiver/ProcessedText.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {
    getStores,
    showFullNameAndNickname,
    transformContact,
    type TransformedContact,
  } from '~/app/ui/nav/receiver';
  import {type Contact, type ProfilePicture, type RemoteModelStoreFor} from '~/common/model';
  import {type LocalModelStore, type RemoteModelStore} from '~/common/model/utils/model-store';
  import {type ReadableStore} from '~/common/utils/store';

  export let filter: string;
  export let contact: RemoteModelStoreFor<LocalModelStore<Contact>>;

  let profilePicture: RemoteModelStore<ProfilePicture> | undefined;
  let transformedContact: TransformedContact | undefined = undefined;
  let isBlocked: ReadableStore<boolean> | undefined = undefined;

  function resetContactData(): void {
    transformedContact = undefined;
    profilePicture = undefined;
    isBlocked = undefined;
  }

  // TODO(DESK-830): Refactor this into the ViewModel.
  $: transformContact($contact)
    .then((c) => {
      transformedContact = c;
      isBlocked = c.isBlocked;
      getStores($contact)
        .then((stores) => {
          profilePicture = stores.profilePicture;
        })
        .catch(resetContactData);
    })
    .catch(resetContactData);
</script>

<template>
  {#if $isBlocked === undefined || !$isBlocked}
    <div class="recipient">
      {#if transformedContact !== undefined && $profilePicture !== undefined}
        <DeprecatedReceiver
          on:click
          {filter}
          profilePicture={{
            alt: $i18n.t(
              'dialog--forward-message.hint--profile-picture',
              'Profile picture of {name}',
              {
                name: transformedContact.displayName,
              },
            ),
            profilePicture: $profilePicture.view,
            initials: transformedContact.initials,
            unread: 0,
            badge: transformedContact.badge,
          }}
          title={{
            title: showFullNameAndNickname(transformedContact)
              ? transformedContact.fullName
              : transformedContact.displayName,
            subtitle: {
              text: showFullNameAndNickname(transformedContact)
                ? transformedContact.nickname
                : undefined,
            },
            isInactive: transformedContact.activityState === 'inactive',
          }}
        >
          <div class="verification-dots" slot="additional-top">
            <VerificationDots
              colors={transformedContact.verificationLevelColors}
              verificationLevel={transformedContact.verificationLevel}
            />
          </div>
          <div class="identity" slot="additional-bottom">
            <ProcessedText text={transformedContact.identity} highlights={filter} />
          </div>
        </DeprecatedReceiver>
      {/if}
    </div>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--cc-t-background-color);

  .recipient {
    @include def-var($-temp-vars, --cc-t-background-color, var(--t-main-background-color));
    @include def-var(
      $--cc-profile-picture-overlay-background-color: var($-temp-vars, --cc-t-background-color)
    );
    background-color: var($-temp-vars, --cc-t-background-color);

    .verification-dots {
      @include def-var(--c-verification-dots-size, rem(6px));
    }

    .identity {
      @extend %font-small-400;
      color: var(--t-text-e2-color);
    }

    &:hover {
      @include def-var(
        $-temp-vars,
        --cc-t-background-color,
        var(--cc-conversation-preview-background-color--hover)
      );
    }
  }
</style>
