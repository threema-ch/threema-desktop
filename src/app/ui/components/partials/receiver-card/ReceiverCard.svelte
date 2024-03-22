<!--
  @component 
  Renders an avatar card (an avatar picture, title and subtitle, badges, and icons) for a specific
  receiver.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import Avatar from '~/app/ui/components/atoms/avatar/Avatar.svelte';
  import type {AvatarCharm} from '~/app/ui/components/atoms/avatar/props';
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
  export let unreadMessageCount: NonNullable<$$Props['unreadMessageCount']> = 0;

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

  function getAvatarCharms(currentReceiver: typeof receiver): AvatarCharm[] | undefined {
    let receiverCharm: AvatarCharm[];
    switch (currentReceiver.badge) {
      case 'contact-consumer':
        receiverCharm = [
          {
            content: {
              type: 'icon',
              description: $i18n.t(
                'contacts.hint--badge-consumer',
                "This contact uses Threema's private version.",
              ),
              icon: 'threema_consumer_contact',
            },
            style: {
              type: 'cutout',
              backgroundColor: 'transparent',
              contentColor: 'var(--cc-profile-picture-overlay-badge-icon-consumer-color)',
              gap: 2,
            },
          },
        ];
        break;

      case 'contact-work':
        receiverCharm = [
          {
            content: {
              type: 'icon',
              description: $i18n.t(
                'contacts.hint--badge-work',
                'This contact uses the business app "Threema Work."',
              ),
              icon: 'threema_work_contact',
            },
            position: 135,
            style: {
              type: 'cutout',
              backgroundColor: 'transparent',
              contentColor: 'var(--cc-profile-picture-overlay-badge-icon-work-color)',
              gap: 2,
            },
          },
        ];
        break;

      case undefined:
        // No charm, as the contact doesn't have a badge.
        receiverCharm = [];
        break;

      default:
        return unreachable(currentReceiver.badge);
    }

    const unreadMessageCountCharm: AvatarCharm[] =
      unreadMessageCount <= 0
        ? []
        : [
            {
              content: {
                type: 'text',
                text: `${unreadMessageCount > 9 ? '9+' : unreadMessageCount}`,
              },
              offset: {
                x: -2,
                y: -2,
              },
              position: 315,
              style: {
                type: 'cutout',
                backgroundColor: 'var(--cc-profile-picture-overlay-unread-background-color)',
                contentColor: 'var(--cc-profile-picture-overlay-unread-text-color)',
                gap: 2,
              },
            },
          ];

    return [...receiverCharm, ...unreadMessageCountCharm];
  }

  $: ({topLeft = [], topRight = [], bottomLeft = [], bottomRight = []} = content);
  $: ({isClickable = false} = options);

  $: updateProfilePictureStore(receiver.lookup);
</script>

<button class={`container ${size}`} disabled={!isClickable} on:click>
  <span class="avatar">
    <Avatar
      byteStore={profilePictureStore}
      charms={getAvatarCharms(receiver)}
      color={receiver.color}
      description={$i18n.t('contacts.hint--profile-picture', {
        name: receiver.name,
      })}
      disabled={!isClickable}
      initials={receiver.initials}
      size={getAvatarSizePxForSize(size)}
    />
  </span>

  <div class="content">
    {#if topLeft.length > 0 || topRight.length > 0}
      <div class="top">
        {#if topLeft.length > 0}
          <div class={`left items`}>
            {#each topLeft as itemOptions}
              <ContentItem options={itemOptions} />
            {/each}
          </div>
        {/if}

        {#if topRight.length > 0}
          <div class={`right items`}>
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
          <div class={`left items`}>
            {#each bottomLeft as itemOptions}
              <ContentItem options={itemOptions} />
            {/each}
          </div>
        {/if}

        {#if bottomRight.length > 0}
          <div class={`right items`}>
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

  .container {
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
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
      min-width: 0;
      max-width: 100%;
      gap: rem(4px);

      @include def-var(--c-verification-dots-size, rem(6px));

      .top,
      .bottom {
        gap: rem(8px);

        .items {
          min-width: 0;
          gap: rem(4px);
        }
      }

      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 0;
        max-width: 100%;

        .left {
          flex: 1 1 auto;

          display: flex;
          align-items: center;
          justify-content: left;
          min-width: 0;
          max-width: 100%;

          color: var(--t-text-e1-color);
        }

        .right {
          flex: 1 0 auto;

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
          flex: 1 1 auto;

          display: flex;
          align-items: center;
          justify-content: left;
          min-width: 0;
          max-width: 100%;
        }

        .right {
          flex: 1 0 auto;

          display: flex;
          align-items: center;
          justify-content: right;
          justify-self: end;

          font-size: rem(12px);
          line-height: rem(12px);
        }
      }
    }

    &.md {
      .content {
        gap: rem(2px);

        .top {
          .left {
            font-size: rem(14px);
            line-height: rem(20px);
          }
        }
      }
    }

    &.sm {
      .content {
        .top {
          .left {
            font-size: rem(16px);
            line-height: rem(16px);
          }
        }
      }
    }
  }
</style>
