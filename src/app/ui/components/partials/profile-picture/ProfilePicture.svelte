<!--
  @component Renders a receiver's profile picture. Note: This basically only reuses the `Avatar`
  component, but includes some additional convenience features, such as loading the profile picture.
-->
<script lang="ts">
  import {globals} from '~/app/globals';
  import Avatar from '~/app/ui/components/atoms/avatar/Avatar.svelte';
  import type {AvatarCharm} from '~/app/ui/components/atoms/avatar/props';
  import type {ProfilePictureProps} from '~/app/ui/components/partials/profile-picture/props';
  import {i18n} from '~/app/ui/i18n';
  import type {DbReceiverLookup} from '~/common/db';
  import type {u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {type IQueryableStore, ReadableStore} from '~/common/utils/store';
  import type {ContactReceiverData} from '~/common/viewmodel/utils/receiver';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.profile-picture');

  type $$Props = ProfilePictureProps;

  export let options: NonNullable<$$Props['options']> = {};
  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];
  export let size: NonNullable<$$Props['size']> = 'md';
  export let unreadMessageCount: NonNullable<$$Props['unreadMessageCount']> = 0;

  let profilePictureStore: IQueryableStore<Blob | undefined> = new ReadableStore(undefined);

  function updateProfilePictureStore(lookup: DbReceiverLookup | 'self'): void {
    if (lookup === 'self') {
      profilePictureStore = services.profilePicture.getProfilePictureForSelf();
      return;
    }

    services.profilePicture
      .getProfilePictureForReceiver(lookup)
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
      case 'lg':
        return 120;

      case 'md':
        return 48;

      case 'sm':
        return 40;

      default:
        return unreachable(currentSize);
    }
  }

  function getAvatarCharms(
    currentReceiver: Pick<ContactReceiverData, 'badge'>,
    hideCharms: boolean | undefined,
  ): AvatarCharm[] {
    if (hideCharms === true) {
      return [];
    }

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
                'This contact uses the business app Threema Work.',
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

  $: ({isClickable = false} = options);

  /**
   * Updates only if the value of `receiver.lookup.type` or `receiver.lookup.uid` changes, not on
   * every change of the `receiver` object.
   */
  let currentReceiverLookup: DbReceiverLookup | 'self' =
    receiver.type === 'self'
      ? 'self'
      : // Cast is needed, because the linter is not able to infer that both types are identical.
        (receiver.lookup satisfies DbReceiverLookup as DbReceiverLookup);
  $: if (receiver.type === 'self') {
    if (currentReceiverLookup !== 'self') {
      currentReceiverLookup = 'self';
    }
  } else if (
    currentReceiverLookup === 'self' ||
    currentReceiverLookup.type !== receiver.lookup.type ||
    currentReceiverLookup.uid !== receiver.lookup.uid
  ) {
    currentReceiverLookup = receiver.lookup;
  }

  $: updateProfilePictureStore(currentReceiverLookup);
</script>

<Avatar
  byteStore={profilePictureStore}
  charms={receiver.type === 'self' ? [] : getAvatarCharms(receiver, options.hideCharms)}
  color={receiver.color}
  description={$i18n.t('contacts.hint--profile-picture', {
    name: receiver.name,
  })}
  disabled={!isClickable}
  initials={receiver.initials}
  size={getAvatarSizePxForSize(size)}
  on:click
/>
