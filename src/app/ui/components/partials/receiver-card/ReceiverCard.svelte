<!--
  @component 
  Renders an avatar card (an avatar picture, title and subtitle, badges, and icons) for a specific
  receiver.
-->
<script lang="ts">
  import ThreemaIcon from 'threema-svelte-components/src/components/blocks/Icon/ThreemaIcon.svelte';
  import {globals} from '~/app/globals';
  import Avatar from '~/app/ui/components/atoms/avatar/Avatar.svelte';
  import ContentItem from '~/app/ui/components/partials/receiver-card/internal/content-item/ContentItem.svelte';
  import type {ReceiverCardProps} from '~/app/ui/components/partials/receiver-card/props';
  import {i18n} from '~/app/ui/i18n';
  import type {DbReceiverLookup} from '~/common/db';
  import type {u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {type IQueryableStore, ReadableStore} from '~/common/utils/store';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.receiver-card');

  type $$Props = ReceiverCardProps;

  export let content: NonNullable<$$Props['content']> = {};
  export let options: NonNullable<$$Props['options']> = {};
  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];
  export let size: NonNullable<$$Props['size']> = 'md';

  let profilePictureStore: IQueryableStore<Blob | undefined> = new ReadableStore(undefined);

  function updateProfilePictureStore(currentReceiverLookup: DbReceiverLookup): void {
    services.profilePicture
      .getProfilePictureForReceiver(currentReceiverLookup)
      .then((store) => {
        if (store === undefined) {
          profilePictureStore = new ReadableStore(undefined);
        } else {
          profilePictureStore = store;
        }
      })
      .catch((error) => {
        log.warn(`Failed to fetch profile picture store: ${error}`);
        profilePictureStore = new ReadableStore(undefined);
      });
  }

  function getAvatarSizePxForSize(currentSize: typeof size): u53 {
    switch (currentSize) {
      case 'md':
        return 48;

      case 'sm':
        return 40;

      default:
        return unreachable(currentSize);
    }
  }

  $: ({topLeft = [], topRight = [], bottomLeft = [], bottomRight = []} = content);
  $: ({isClickable = false} = options);

  $: updateProfilePictureStore(receiver.lookup);
</script>

<button class="receiver-card" disabled={!isClickable} on:click>
  <span class="avatar">
    <Avatar
      byteStore={profilePictureStore}
      charm={{
        positionDegrees: 135,
      }}
      color={receiver.color}
      description={$i18n.t('contacts.hint--profile-picture', {
        name: receiver.name,
      })}
      disabled={!isClickable}
      initials={receiver.initials}
      size={getAvatarSizePxForSize(size)}
    >
      <div slot="charm">
        {#if receiver.badge === 'contact-work'}
          <div
            class="work"
            title={$i18n.t(
              'contacts.hint--badge-work',
              'This contact uses the business app "Threema Work."',
            )}
          >
            <ThreemaIcon theme="Filled">threema_work_contact</ThreemaIcon>
          </div>
        {:else if receiver.badge === 'contact-consumer'}
          <div
            class="consumer"
            title={$i18n.t(
              'contacts.hint--badge-consumer',
              "This contact uses Threema's private version.",
            )}
          >
            <ThreemaIcon theme="Filled">threema_consumer_contact</ThreemaIcon>
          </div>
        {:else if receiver.badge === undefined}
          <!-- Do nothing, as the contact doesn't have a badge. -->
        {:else}
          {unreachable(receiver.badge)}
        {/if}
      </div>
    </Avatar>
  </span>

  <div class="content">
    {#if topLeft.length > 0 || topRight.length > 0}
      <div class="top">
        {#if topLeft.length > 0}
          <div class={`left items ${size}`}>
            {#each topLeft as itemOptions}
              <ContentItem options={itemOptions} />
            {/each}
          </div>
        {/if}

        {#if topRight.length > 0}
          <div class={`right items ${size}`}>
            {#each topRight as itemOptions}
              <ContentItem options={itemOptions} />
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if bottomLeft.length > 0 || bottomRight.length > 0}
      <div class="bottom">
        {#if bottomLeft.length > 0}
          <div class={`left items ${size}`}>
            {#each bottomLeft as itemOptions}
              <ContentItem options={itemOptions} />
            {/each}
          </div>
        {/if}

        {#if bottomRight.length > 0}
          <div class={`right items ${size}`}>
            {#each bottomRight as itemOptions}
              <ContentItem options={itemOptions} />
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</button>

<style lang="scss">
  @use 'component' as *;

  .receiver-card {
    @extend %neutral-input;

    display: flex;
    align-items: center;
    justify-content: start;
    gap: rem(8px);
    min-width: 0;
    max-width: 100%;

    &:hover:not(:disabled) {
      cursor: pointer;
    }

    .avatar {
      flex: none;
      // Prevent bottom space.
      line-height: 0;

      .charm {
        .work {
          color: var(--cc-profile-picture-overlay-badge-icon-work-color);
        }

        .consumer {
          color: var(--cc-profile-picture-overlay-badge-icon-consumer-color);
        }
      }
    }

    .content {
      display: inline-flex;
      flex-direction: column;
      align-items: start;
      justify-content: center;
      flex: 1 1 0;
      min-width: 0;
      gap: rem(2px);

      @include def-var(--c-verification-dots-size, rem(6px));

      .items {
        min-width: 0;
      }

      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 0;
        max-width: 100%;

        .left {
          display: flex;
          align-items: center;
          justify-content: left;

          color: var(--t-text-e1-color);

          &.md {
            font-size: rem(14px);
            line-height: rem(14px);
          }

          &.sm {
            font-size: rem(16px);
            line-height: rem(16px);
          }
        }

        .right {
          display: flex;
          align-items: center;
          justify-content: right;
          justify-self: end;

          color: var(--t-text-e2-color);
          font-size: rem(12px);
          line-height: rem(12px);
        }
      }

      .bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 0;
        max-width: 100%;

        color: var(--t-text-e2-color);
        font-size: rem(14px);
        line-height: rem(14px);

        .left {
          display: flex;
          align-items: center;
          justify-content: left;
        }

        .right {
          display: flex;
          align-items: center;
          justify-content: right;
          justify-self: end;
        }
      }
    }
  }
</style>
