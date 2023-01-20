<script lang="ts">
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import ProfilePicture from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import {type ConversationData} from '~/app/ui/main/conversation';
  import {type ConversationTopBarMode} from '~/app/ui/main/conversation/top-bar';
  import TopBarMode from '~/app/ui/main/conversation/top-bar/TopBarMode.svelte';
  import TopBarSearch from '~/app/ui/main/conversation/top-bar/TopBarSearch.svelte';
  import {type DbReceiverLookup} from '~/common/db';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';
  import {display} from '~/common/dom/ui/state';
  import {ReceiverType} from '~/common/enum';
  import {unreachable} from '~/common/utils/assert';

  /**
   * Current display mode.
   */
  export let mode: ConversationTopBarMode = 'conversation-detail';

  /**
   * Receiver data.
   */
  export let receiver: ConversationData['receiver'];

  /**
   * Receiver lookup data.
   */
  export let receiverLookup: DbReceiverLookup;

  /**
   * Placeholder of the search field.
   */
  export let searchPlaceholder = 'Search';

  /**
   * Search string of the search field.
   */
  export let search = '';

  /**
   * App services.
   */
  export let services: AppServices;
  const {router} = services;

  // Determine if this is an inactive group
  export let isInactiveGroup: boolean;

  /**
   * Reset the top bar state.
   */
  function reset(): void {
    search = '';
    mode = 'conversation-detail';
  }

  function openAside(): void {
    switch (receiverLookup.type) {
      case ReceiverType.CONTACT:
        router.replaceAside(
          ROUTE_DEFINITIONS.aside.contactDetails.withTypedParams({contactUid: receiverLookup.uid}),
        );
        break;

      case ReceiverType.GROUP:
        router.replaceAside(
          ROUTE_DEFINITIONS.aside.groupDetails.withTypedParams({groupUid: receiverLookup.uid}),
        );
        break;

      case ReceiverType.DISTRIBUTION_LIST:
        // TODO(WEBMD-771): Open distribution list detail route
        break;
      default:
        unreachable(receiverLookup, new Error('Unhandled receiverLookup type'));
    }
  }

  function closeConversation(): void {
    router.replaceMain(ROUTE_DEFINITIONS.main.welcome.withTypedParams(undefined));
  }
</script>

<template>
  <div data-mode={mode}>
    {#if mode === 'conversation-detail'}
      <div class="detail" data-type={receiver.type} data-display={$display}>
        {#if $display === 'small'}
          <div class="back">
            <IconButton flavor="naked" on:click={closeConversation}>
              <MdIcon theme="Outlined">arrow_back</MdIcon>
            </IconButton>
          </div>
        {/if}
        <div class="profile-picture" on:click={openAside}>
          <ProfilePicture
            img={transformProfilePicture(receiver.profilePicture.img)}
            alt="Profile picture of {receiver.name}"
            initials={receiver.profilePicture.initials}
            color={receiver.profilePicture.color}
            shape={'circle'}
          />
        </div>
        <div class="title" class:group-inactive={isInactiveGroup} on:click={openAside}>
          {receiver.name}
        </div>
        <div class="details" on:click={openAside}>
          {#if receiver.type === 'contact'}
            <VerificationDots
              colors={receiver.verificationLevelColors}
              verificationLevel={receiver.verificationLevel}
            />
          {/if}
          {#if receiver.type === 'group'}
            {receiver.memberNames.join(', ')}
          {/if}
          {#if receiver.type === 'distribution-list'}
            TODO
          {/if}
        </div>
        <div class="actions">
          {#if receiver.type === 'contact'}
            <!-- <IconButton flavor="naked" class="wip">
              <ThreemaIcon theme="Outlined">secure_calls</ThreemaIcon>
            </IconButton> -->
          {/if}
          <!-- <IconButton on:click={() => (mode = 'title')} flavor="naked" class="wip">
            <MdIcon theme="Outlined">notifications_active</MdIcon>
          </IconButton> -->
          {#if receiver.type !== 'distribution-list'}
            <IconButton flavor="naked" class="wip">
              <MdIcon theme="Outlined">more_vert</MdIcon>
            </IconButton>
          {/if}
        </div>
      </div>
    {:else if mode === 'search'}
      <TopBarMode on:close={reset}>
        <TopBarSearch placeholder={searchPlaceholder} bind:value={search} on:close={reset} />
      </TopBarMode>
    {:else if mode === 'title'}
      <TopBarMode on:close={() => (mode = 'conversation-detail')}>
        <slot name="title" />
      </TopBarMode>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  [data-mode='conversation-detail'] {
    .detail {
      display: grid;
      grid-template:
        'profile-picture title   actions' #{rem(24px)}
        'profile-picture details actions' #{rem(16px)}
        / #{rem(40px)} 1fr auto;
      column-gap: rem(8px);
      padding: #{rem(12px)} #{rem(8px)} #{rem(12px)} #{rem(16px)};

      &[data-display='small'] {
        grid-template:
          'back profile-picture title   actions' #{rem(24px)}
          'back profile-picture details actions' #{rem(16px)}
          / #{rem(40px)} #{rem(40px)} 1fr auto;
      }

      .back {
        grid-area: back;
        user-select: none;
        cursor: pointer;
      }

      .profile-picture {
        grid-area: profile-picture;
        user-select: none;
        cursor: pointer;
      }

      .title {
        @extend %font-large-400;
        @extend %text-overflow-ellipsis;
        margin-bottom: rem(-4px);
        color: var(--t-text-e1-color);
        grid-area: title;
        cursor: pointer;

        &.group-inactive {
          text-decoration: line-through;
        }
      }

      .details {
        @extend %font-normal-400;
        @extend %text-overflow-ellipsis;
        color: var(--t-text-e2-color);
        grid-area: details;
        cursor: pointer;
      }

      .actions {
        grid-area: actions;
        display: grid;
        grid-auto-flow: column;
      }

      &[data-type='contact'] {
        .title {
          display: grid;
          margin-bottom: rem(-4px);
          padding-top: rem(4px);
        }

        .details {
          @include def-var(--c-verification-dots-size, rem(6px));
          margin-top: -4px;
        }
      }
    }
  }
</style>
