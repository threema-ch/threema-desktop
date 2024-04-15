<!--
  @component Renders details about a receiver of type `Contact`.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import type {ContactContentProps} from '~/app/ui/components/partials/contact-detail/internal/contact-content/props';
  import type {ModalState} from '~/app/ui/components/partials/contact-detail/internal/contact-content/types';
  import ThreemaIdInfoModal from '~/app/ui/components/partials/modals/threema-id-info-modal/ThreemaIdInfoModal.svelte';
  import VerificationLevelInfoModal from '~/app/ui/components/partials/modals/verification-level-info-modal/VerificationLevelInfoModal.svelte';
  import ProfilePicture from '~/app/ui/components/partials/profile-picture/ProfilePicture.svelte';
  import {i18n} from '~/app/ui/i18n';
  import type {I18nType} from '~/app/ui/i18n-types';
  import VerificationDots from '~/app/ui/svelte-components/threema/VerificationDots/VerificationDots.svelte';
  import {formatDateLocalized} from '~/app/ui/utils/timestamp';
  import type {AppearanceSettings} from '~/common/model/types/settings';
  import type {RemoteModelStore} from '~/common/model/utils/model-store';
  import {unreachable} from '~/common/utils/assert';
  import type {AnyReceiverData} from '~/common/viewmodel/utils/receiver';

  type $$Props = ContactContentProps;

  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];

  const {
    settings: {appearance},
  } = services;

  let modalState: ModalState = {type: 'none'};

  const dispatch = createEventDispatcher<{
    clickedit: undefined;
    clickprofilepicture: undefined;
  }>();

  function handleClickEdit(): void {
    dispatch('clickedit');
  }

  function handleClickProfilePicture(): void {
    dispatch('clickprofilepicture');
  }

  function handleClickThreemaIdInfoIcon(): void {
    modalState = {
      type: 'threema-id-info',
      props: {
        publicKey: receiver.publicKey,
      },
    };
  }

  function handleClickVerificationLevelInfoIcon(): void {
    modalState = {
      type: 'verification-level-info',
      props: {
        colors: receiver.verification.type,
      },
    };
  }

  function handleCloseModal(): void {
    modalState = {
      type: 'none',
    };
  }

  function getDoNotDisturbDuration(
    currentAppearance: ReturnType<RemoteModelStore<AppearanceSettings>['get']>,
    currentI18n: I18nType,
    currentNotificationPolicy: AnyReceiverData['notificationPolicy'],
  ): string {
    switch (currentNotificationPolicy.type) {
      case 'default':
        return currentI18n.t('settings.action--do-not-disturb-default', 'Off');

      case 'mentioned':
      case 'never':
        return currentNotificationPolicy.expiresAt === undefined
          ? currentI18n.t('settings.action--do-not-disturb-indefinite', 'Indefinitely')
          : currentI18n.t('settings.action--do-not-disturb-until', 'Until {date}', {
              date: formatDateLocalized(
                currentNotificationPolicy.expiresAt,
                currentI18n,
                'auto',
                currentAppearance.view.use24hTime,
              ),
            });

      default:
        return unreachable(currentNotificationPolicy);
    }
  }
</script>

<div class="container">
  <div class="profile-picture">
    <ProfilePicture
      {receiver}
      {services}
      options={{
        isClickable: true,
      }}
      size="lg"
      on:click={handleClickProfilePicture}
    />

    {#if receiver.badge === 'contact-work'}
      <div class="badge" data-badge={receiver.badge}>
        <span>{$i18n.t('contacts.label--badge-work', 'Threema Work Contact')}</span>
      </div>
    {/if}

    <div class="details">
      <Text
        alignment={'center'}
        color="mono-high"
        family="secondary"
        size="body-large"
        text={receiver.name}
      />
      <button class="edit" on:click={handleClickEdit}>
        <Text
          color="inherit"
          family="secondary"
          size="body-small"
          text={$i18n.t('contacts.action--edit', 'Edit')}
        />
      </button>
    </div>
  </div>

  <KeyValueList>
    <KeyValueList.Section>
      <KeyValueList.Item
        key={$i18n.t('contacts.label--threema-id', 'Threema ID')}
        options={{
          showInfoIcon: true,
        }}
        on:clickinfoicon={handleClickThreemaIdInfoIcon}
      >
        {#if receiver.isBlocked}
          <span class="blocked-icon"> BLOCKED </span>
        {/if}
        <Text text={receiver.identity} selectable />
      </KeyValueList.Item>

      <KeyValueList.Item
        key={$i18n.t('contacts.label--verification-level', 'Verification Level')}
        options={{
          showInfoIcon: true,
        }}
        on:clickinfoicon={handleClickVerificationLevelInfoIcon}
      >
        <span class="verification-dots">
          <VerificationDots
            colors={receiver.verification.type}
            verificationLevel={receiver.verification.level}
          />
        </span>
      </KeyValueList.Item>

      <KeyValueList.Item key={$i18n.t('contacts.label--nickname', 'Nickname')}>
        <Text text={receiver.nickname ?? '-'} selectable />
      </KeyValueList.Item>
    </KeyValueList.Section>

    <!-- TODO(DESK-1163):  When notification policies are respected by the system, show this in all
    environments. -->
    {#if import.meta.env.DEBUG}
      <KeyValueList.Section
        title={`🐞 ${$i18n.t('settings.label--notifications', 'Notifications')}`}
        options={{disableItemInset: true}}
      >
        <KeyValueList.Item key={$i18n.t('settings.label--do-not-disturb', 'Do Not Disturb')}>
          <Text
            text={getDoNotDisturbDuration($appearance, $i18n, receiver.notificationPolicy)}
            selectable
          />

          {#if receiver.notificationPolicy.type === 'mentioned'}
            <Text
              text={$i18n.t('settings.action--do-not-disturb-mentioned', 'Notify When Mentioned')}
              selectable
            />
          {/if}
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

    <KeyValueList.Section
      title={$i18n.t('settings.label--privacy', 'Privacy')}
      options={{disableItemInset: true}}
    >
      <KeyValueList.Item key={$i18n.t('settings.label--read-receipts', 'Read Receipts')}>
        {#if receiver.readReceiptPolicy === 'default'}
          <Text
            text={$i18n.t('settings.action--control-message-default-send', 'Default (Send)')}
            selectable
          />
        {:else if receiver.readReceiptPolicy === 'do-not-send'}
          <Text
            text={$i18n.t('settings.action--control-message-do-not-send', "Don't Send")}
            selectable
          />
        {:else if receiver.readReceiptPolicy === 'send'}
          <Text text={$i18n.t('settings.action--control-message-send', 'Send')} selectable />
        {:else}
          {unreachable(receiver.readReceiptPolicy)}
        {/if}
      </KeyValueList.Item>

      <!-- TODO(DESK-209):  When typing indicator sending is implemented, show this in all
      environments. -->
      {#if import.meta.env.DEBUG}
        <KeyValueList.Item
          key={`🐞 ${$i18n.t('settings.label--typing-indicator', 'Typing Indicator')}`}
        >
          {#if receiver.typingIndicatorPolicy === 'default'}
            <Text
              text={$i18n.t('settings.action--control-message-default-send', 'Default (Send)')}
              selectable
            />
          {:else if receiver.typingIndicatorPolicy === 'do-not-send'}
            <Text
              text={$i18n.t('settings.action--control-message-do-not-send', "Don't Send")}
              selectable
            />
          {:else if receiver.typingIndicatorPolicy === 'send'}
            <Text text={$i18n.t('settings.action--control-message-send', 'Send')} selectable />
          {:else}
            {unreachable(receiver.typingIndicatorPolicy)}
          {/if}
        </KeyValueList.Item>
      {/if}
    </KeyValueList.Section>
  </KeyValueList>
</div>

{#if modalState.type === 'none'}
  <!-- No modal is displayed in this state. -->
{:else if modalState.type === 'threema-id-info'}
  <ThreemaIdInfoModal {...modalState.props} on:close={handleCloseModal} />
{:else if modalState.type === 'verification-level-info'}
  <VerificationLevelInfoModal {...modalState.props} on:close={handleCloseModal} />
{:else}
  {unreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: column;

    .profile-picture {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: start;
      gap: rem(8px);
      padding: 0 rem(16px) rem(16px) rem(16px);

      .badge {
        @extend %font-meta-400;

        text-align: center;
        margin: rem(8px) 0;

        > span {
          padding: rem(2px) rem(4px);
          border-radius: rem(4px);
        }

        &[data-badge='contact-consumer'] > span {
          color: var(--cc-contact-details-badge-consumer-text-color);
          background-color: var(--cc-contact-details-badge-consumer-background-color);
        }

        &[data-badge='contact-work'] > span {
          color: var(--cc-contact-details-badge-work-text-color);
          background-color: var(--cc-contact-details-badge-work-background-color);
        }
      }

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

    .verification-dots {
      --c-verification-dots-size: #{rem(6px)};
    }
  }
</style>
