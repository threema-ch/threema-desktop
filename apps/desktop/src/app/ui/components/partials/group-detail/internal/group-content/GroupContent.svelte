<!--
  @component Renders details about a receiver of type `Group`.
-->
<script lang="ts">
  import type {u53} from '@threema/ts-utils/integer/u53';

  import {globals} from '~/app/globals';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import {getGroupReceiverDataMemberCount} from '~/app/ui/components/partials/group-detail/internal/group-content/helpers';
  import type {GroupContentProps} from '~/app/ui/components/partials/group-detail/internal/group-content/props';
  import type {ContextMenuItemHandlerProps} from '~/app/ui/components/partials/group-detail/types';
  import ProfilePicture from '~/app/ui/components/partials/profile-picture/ProfilePicture.svelte';
  import ReceiverPreviewList from '~/app/ui/components/partials/receiver-preview-list/ReceiverPreviewList.svelte';
  import type {
    ReceiverPreviewListItem,
    ContextMenuItemWithHandlerProps,
  } from '~/app/ui/components/partials/receiver-preview-list/props';
  import type {InteractionEvent} from '~/app/ui/components/partials/receiver-preview-list/types';
  import {i18n} from '~/app/ui/i18n';
  import type {I18nType} from '~/app/ui/i18n-types';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {getDoNotDisturbDuration} from '~/app/ui/utils/do-not-disturb';
  import {reactive} from '~/app/ui/utils/svelte';
  import {unreachable} from '~/common/utils/assert';

  const {systemTime} = globals.unwrap();

  const {
    contactPreviewList,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onclickdeletegroup,
    onclickeditmembers,
    onclickeditname,
    onclickitem,
    onclickleavegroup,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onlclickleaveanddeletegroup,
    onclickprofilepicture,
    onclickremovemember,
    receiver,
    services,
  }: GroupContentProps = $props();

  const {
    settings: {
      views: {appearance},
    },
  } = services;

  const DEFAULT_LIMIT = 4;

  let currentLimit = $state<u53 | undefined>(DEFAULT_LIMIT);

  function getContextMenuItems(
    receiverPreviewListItem: ReceiverPreviewListItem<ContextMenuItemHandlerProps>,
    userIsCreator: boolean,
    userHasLeft: boolean,
    t: I18nType['t'],
  ): ContextMenuItemWithHandlerProps<ContextMenuItemHandlerProps>[] {
    if (!userIsCreator || userHasLeft) {
      // Don't show a context menu if the user is not the creator, as there are no other options at
      // this time.
      return [];
    }

    switch (receiverPreviewListItem.receiver.type) {
      case 'contact':
        return [
          {
            type: 'option',
            disabled: false,
            handler: async (props) => await onclickremovemember(props),
            label: t('groups.action--remove-member', 'Remove {name}', {
              name:
                receiverPreviewListItem.receiver.name.length > 25
                  ? `${receiverPreviewListItem.receiver.name.slice(0, 23)}…`
                  : receiverPreviewListItem.receiver.name,
            }),
            icon: {
              name: 'person_remove',
            },
          },
        ];

      // The creator currently does not have any context menu items. Groups and distribution lists
      // cannot happen here.
      case 'self':
      case 'distribution-list':
      case 'group':
        return [];
      default:
        return unreachable(receiverPreviewListItem.receiver);
    }
  }

  function handleClickToggleExpand(): void {
    currentLimit = currentLimit === undefined ? DEFAULT_LIMIT : undefined;
  }

  function handleChangeReceiver(): void {
    currentLimit = DEFAULT_LIMIT;
  }

  function handleInteraction(event: InteractionEvent): void {
    if (event.type !== 'click') {
      return;
    }

    onclickitem?.(event.receiver, event.active);
  }

  const totalMemberCount = $derived(getGroupReceiverDataMemberCount(receiver));

  const currentReceiverId = $derived(receiver.id);
  $effect(() => reactive(handleChangeReceiver, [currentReceiverId]));

  const limitedMemberList = $derived(contactPreviewList.slice(0, currentLimit));

  $effect(() => {
    reactive(handleChangeReceiver, [receiver]);
  });
</script>

<div class="container">
  <div class="profile-picture">
    <ProfilePicture
      onclick={onclickprofilepicture}
      options={{
        isClickable: true,
      }}
      {receiver}
      {services}
      size="lg"
    />

    <div class="details">
      <Text
        alignment="center"
        color="mono-high"
        family="secondary"
        size="body-large"
        text={receiver.name}
      />
      {#if receiver.creator.type === 'self' && !receiver.isLeft}
        <button class="edit" onclick={onclickeditname}>
          <Text
            color="inherit"
            family="secondary"
            size="body-small"
            text={$i18n.t('common.action--edit', 'Edit')}
          />
        </button>
      {/if}
    </div>
  </div>

  <div class="list">
    <div class="heading">
      {$i18n.t(
        'groups.label--group-members-count-long',
        '{n, plural, =0 {No Group Members} =1 {1 Group Member} other {# Group Members}}',
        {n: totalMemberCount},
      )}
    </div>
    {#if contactPreviewList.length > 0}
      <ReceiverPreviewList
        contextMenuItems={(receiverPreviewListItem) =>
          getContextMenuItems(
            receiverPreviewListItem,
            receiver.creator.type === 'self',
            receiver.isLeft,
            $i18n.t,
          )}
        items={limitedMemberList}
        options={{highlightActiveReceiver: true}}
        oninteraction={handleInteraction}
        {services}
      />
      {#if totalMemberCount > DEFAULT_LIMIT}
        <button class="expand" onclick={handleClickToggleExpand}>
          {#if currentLimit === undefined}
            <span class="icon">
              <MdIcon theme="Outlined">expand_less</MdIcon>
            </span>
            {$i18n.t('groups.action--group-members-show-less', 'Show Less')}
          {:else}
            <span class="icon">
              <MdIcon theme="Outlined">expand_more</MdIcon>
            </span>
            {$i18n.t('groups.action--group-members-show-all', 'Show All')}
          {/if}
        </button>
      {/if}
    {:else}
      <!-- No members. -->
    {/if}
  </div>

  <KeyValueList>
    <!--TODO(DESK-1852) Move this condition below the KeyValueList.Section.-->
    {#if !receiver.isLeft}
      <KeyValueList.Section
        title={$i18n.t('groups.label--group-management', 'Group Management')}
        options={{disableItemInset: true}}
      >
        {#if receiver.creator.type === 'self'}
          <KeyValueList.ItemWithButton icon="edit" key="" onclick={onclickeditmembers}>
            <Text text={$i18n.t('groups.action--edit-members', 'Edit Members')} />
          </KeyValueList.ItemWithButton>
        {/if}
        <KeyValueList.ItemWithButton icon="logout" key="" onclick={onclickleavegroup}>
          <Text
            text={receiver.creator.type === 'self'
              ? $i18n.t('groups.action--dissolve', 'Dissolve Group')
              : $i18n.t('groups.action--leave', 'Leave Group')}
          />
        </KeyValueList.ItemWithButton>
        <!-- TODO(DESK-1852): Activate this feature.
        <KeyValueList.ItemWithButton icon="delete" key="" onclick={onlclickleaveanddeletegroup}>
          <Text text={$i18n.t('groups.action--leave-and-delete', 'Leave and Delete Group')} />
        </KeyValueList.ItemWithButton>
      {:else}
        <KeyValueList.ItemWithButton icon="delete" key="" onclick={onclickdeletegroup}>
          <Text text={$i18n.t('groups.action--delete', 'Delete Group')} />
        </KeyValueList.ItemWithButton>
        -->
      </KeyValueList.Section>
    {/if}

    <!-- TODO(DESK-1163):  When notification policies are respected by the system, show this in all
    environments. -->
    {#if import.meta.env.DEBUG}
      <KeyValueList.Section
        title={`🐞 ${$i18n.t('settings.label--notifications', 'Notifications')}`}
        options={{disableItemInset: true}}
      >
        <KeyValueList.Item key={$i18n.t('settings.label--do-not-disturb', 'Do Not Disturb')}>
          <Text
            text={getDoNotDisturbDuration(
              $appearance,
              $i18n,
              receiver.notificationPolicy,
              $systemTime,
            )}
          />
        </KeyValueList.Item>

        {#if receiver.notificationPolicy.type === 'mentioned' || receiver.notificationPolicy.type === 'never'}
          <KeyValueList.ItemWithSwitch
            key={$i18n.t('settings.action--do-not-disturb-mentioned', 'Notify When Mentioned')}
            checked={receiver.notificationPolicy.type === 'mentioned'}
            disabled
          >
            {#if receiver.notificationPolicy.type === 'mentioned'}
              <Text
                text={$i18n.t(
                  'settings.prose--do-not-disturb-mentioned-on',
                  'You will only receive notifications when you are mentioned',
                )}
              />
            {:else}
              <Text
                text={$i18n.t(
                  'settings.prose--do-not-disturb-mentioned-off',
                  'You will not receive any notifications',
                )}
              />
            {/if}
          </KeyValueList.ItemWithSwitch>
        {/if}

        <KeyValueList.ItemWithSwitch
          key={$i18n.t('settings.label--play-notification-sound', 'Play Notification Sound')}
          checked={!receiver.notificationPolicy.isMuted}
          disabled
        >
          {#if receiver.notificationPolicy.isMuted}
            <Text text={$i18n.t('settings.action--play-notification-sound-off', 'Off')} />
          {:else}
            <Text text={$i18n.t('settings.action--play-notification-sound-default', 'On')} />
          {/if}
        </KeyValueList.ItemWithSwitch>
      </KeyValueList.Section>
    {/if}
  </KeyValueList>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: column;

    padding-bottom: 8px;

    .profile-picture {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: start;
      gap: rem(8px);
      padding: 0 rem(16px) rem(16px) rem(16px);

      .details {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: start;

        .edit {
          @extend %neutral-input;

          color: var(--t-color-primary);
          cursor: pointer;
        }
      }
    }

    .list {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: start;

      padding-bottom: rem(8px);

      .heading {
        @extend %font-small-400;
        color: var(--t-text-e2-color);
        padding: rem(10px) rem(16px);
      }

      .expand {
        @include clicktarget-button-rect;

        & {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: start;
          gap: rem(12px);

          color: var(--t-text-e2-color);
          margin: rem(8px) 0 0 0;
          padding: rem(12px) rem(16px);
        }

        .icon {
          --c-icon-font-size: #{rem(24px)};
          display: grid;
          place-items: center;
          color: var(--t-color-primary);
        }

        &:hover {
          background-color: var(--ic-list-element-background-color--hover);
        }
      }
    }
  }
</style>
