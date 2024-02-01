<script lang="ts">
  import IconButton from '~/app/ui/svelte-components/blocks/Button/IconButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import VerificationDots from '~/app/ui/svelte-components/threema/VerificationDots/VerificationDots.svelte';
  import {globals} from '~/app/globals';
  import type {RouterState} from '~/app/routing/router';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import type {AppServices} from '~/app/types';
  import ProfilePictureModal from '~/app/ui/components/partials/modals/profile-picture-modal/ProfilePictureModal.svelte';
  import BlockedIcon from '~/app/ui/generic/icon/BlockedIcon.svelte';
  import RecipientProfilePicture from '~/app/ui/generic/receiver/ProfilePicture.svelte';
  import {i18n} from '~/app/ui/i18n';
  import DeleteDialog from '~/app/ui/modal/ContactDelete.svelte';
  import IdentityInformationDialog from '~/app/ui/modal/ContactIdentityInformation.svelte';
  import UnableToDeleteDialog from '~/app/ui/modal/ContactUnableToDelete.svelte';
  import VerificationLevelsDialog from '~/app/ui/modal/ContactVerificationLevels.svelte';
  import Divider from '~/app/ui/nav/receiver/detail/Divider.svelte';
  import ListElement from '~/app/ui/nav/receiver/detail/ListElement.svelte';
  import Subheader from '~/app/ui/nav/receiver/detail/Subheader.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {formatDateLocalized} from '~/app/ui/utils/timestamp';
  import {display} from '~/common/dom/ui/state';
  import {
    ContactNotificationTriggerPolicy,
    NotificationSoundPolicy,
    ReadReceiptPolicy,
    ReceiverType,
    TypingIndicatorPolicy,
  } from '~/common/enum';
  import type {ContactController, ProfilePicture} from '~/common/model';
  import type {RemoteModelController} from '~/common/model/types/common';
  import type {RemoteModelStore} from '~/common/model/utils/model-store';
  import {unreachable} from '~/common/utils/assert';
  import type {Remote} from '~/common/utils/endpoint';
  import type {LocalStore} from '~/common/utils/store';
  import type {ContactListItemViewModel} from '~/common/viewmodel/contact-list-item';

  const log = globals.unwrap().uiLogging.logger('ui.component.contact-details');

  /**
   * App Services
   */
  export let services: AppServices;

  // Unpack services
  const {
    router,
    backend,
    settings: {appearance},
  } = services;

  let contactViewModel: Remote<LocalStore<ContactListItemViewModel>> | undefined;
  let contactController: RemoteModelController<ContactController> | undefined;
  let profilePicture: RemoteModelStore<ProfilePicture> | undefined;
  /**
   * Fetch contact viewmodel and profile picture store.
   */
  async function fetchContact(routerState: RouterState): Promise<void> {
    const contactStore =
      routerState.aside?.id === 'contactDetails'
        ? await backend.viewModel.contactListItem(routerState.aside.params.contactUid)
        : undefined;
    if (contactStore === undefined) {
      closeAside();
      return;
    }
    const contactInfo = contactStore.get();
    contactViewModel = contactInfo.viewModelStore;
    contactController = contactInfo.contactModelStore.get().controller;
    profilePicture = contactInfo.viewModelStore.get().profilePicture;
  }

  $: void fetchContact($router);

  function closeAside(): void {
    router.closeAside();
  }

  // Switch different modal dialogs
  let deleteContactDialogVisible = false;
  let unableToDeleteContactDialogVisible = false;
  let contactProfilePictureDialogVisible = false;
  let verificationLevelsDialogVisible = false;
  let identityInformationDialogVisible = false;

  let displayName: string;

  function openContactEditDialog(): void {
    if (contactViewModel !== undefined) {
      router.replaceModal(
        ROUTE_DEFINITIONS.modal.contactEdit.withTypedParams({
          contactUid: contactViewModel.get().uid,
        }),
      );
    }
  }

  // TODO(IOS-3686): Re-enable
  /*
  async function handleClickedOnDeleteContact(): Promise<void> {
    if ($contactViewModel === undefined || contactController === undefined) {
      return;
    }
    displayName = $contactViewModel.displayName;
    if (await contactController.isRemovable()) {
      deleteContactDialogVisible = true;
    } else {
      unableToDeleteContactDialogVisible = true;
    }
  }
  */

  function deleteContact(): void {
    if (import.meta.env.BUILD_VARIANT === 'work') {
      // For the time being deleting contacts is not allowed in the Work variant
      return;
    }

    if (contactViewModel === undefined || contactController === undefined) {
      return;
    }
    const contact = contactViewModel.get();

    // Redirect to welcome if current route is a conversation route with contact to delete
    const route = $router.main;
    if (
      route.id === 'conversation' &&
      route.params.receiverLookup.type === ReceiverType.CONTACT &&
      route.params.receiverLookup.uid === contact.uid
    ) {
      router.go($router.nav, ROUTE_DEFINITIONS.main.welcome.withoutParams(), undefined, undefined);
    }

    displayName = contact.displayName;
    contactController.remove
      .fromLocal()
      .then(() => {
        toast.addSimpleSuccess(
          $i18n.t('contacts.success--delete-contact', 'Successfully removed contact "{name}"', {
            name: displayName,
          }),
        );
      })
      .catch(() => {
        log.error('Could not delete contact');
        toast.addSimpleFailure(
          $i18n.t('contacts.error--delete-contact', 'Could not delete contact "{name}"', {
            name: displayName,
          }),
        );
      });

    deleteContactDialogVisible = false;
    closeAside();
  }

  function handleCloseProfilePictureModal(): void {
    contactProfilePictureDialogVisible = false;
  }
</script>

<template>
  <div class="aside-contact">
    <header data-display={$display}>
      <div class="back">
        <IconButton flavor="naked" on:click={closeAside}>
          <MdIcon theme="Outlined">arrow_back</MdIcon>
        </IconButton>
      </div>
      {$i18n.t('contacts.label--contact-detail', 'Contact Detail')}
      <div class="close">
        <IconButton flavor="naked" on:click={closeAside}>
          <MdIcon theme="Outlined">close</MdIcon>
        </IconButton>
      </div>
    </header>

    {#if $contactViewModel !== undefined && $profilePicture !== undefined}
      <div class="profile-picture">
        <span>
          <RecipientProfilePicture
            on:click={() => {
              contactProfilePictureDialogVisible = true;
            }}
            profilePicture={$profilePicture.view}
            alt={$i18n.t('contacts.hint--profile-picture', 'Profile picture of {name}', {
              name: $contactViewModel.displayName,
            })}
            initials={$contactViewModel.initials}
            badge={$contactViewModel.badge}
          />
        </span>
      </div>
      {#if $contactViewModel.badge === 'contact-work'}
        <div class="badge" data-badge={$contactViewModel.badge}>
          <span>{$i18n.t('contacts.label--badge-work', 'Threema Work Contact')}</span>
        </div>
      {/if}
      <div class="name">
        {$contactViewModel.displayName}
      </div>
      <div class="edit">
        <span on:click={openContactEditDialog}>{$i18n.t('contacts.action--edit', 'Edit')}</span>
      </div>
      <ListElement
        bind:isInfoModalVisible={identityInformationDialogVisible}
        label={$i18n.t('contacts.label--threema-id', 'Threema ID')}
      >
        {#if $contactViewModel.isBlocked}
          <span class="blocked-icon">
            <BlockedIcon />
          </span>
        {/if}
        {$contactViewModel.identity}
      </ListElement>
      <div class="level">
        <ListElement
          bind:isInfoModalVisible={verificationLevelsDialogVisible}
          label={$i18n.t('contacts.label--verification-level', 'Verification Level')}
        >
          <VerificationDots
            colors={$contactViewModel.verificationLevelColors}
            verificationLevel={$contactViewModel.verificationLevel}
          />
        </ListElement>
      </div>
      <ListElement label={$i18n.t('contacts.label--nickname', 'Nickname')}
        >{$contactViewModel.nickname ?? '-'}</ListElement
      >
      <Divider />
      {#if import.meta.env.DEBUG}
        <Subheader label={$i18n.t('settings.label--notifications', 'Notifications')} />
        <ListElement label={`🐞 ${$i18n.t('settings.label--do-not-disturb', 'Do Not Disturb')}`}>
          {#if $contactViewModel.notificationTriggerPolicyOverride === undefined}
            {$i18n.t('settings.action--do-not-disturb-default', 'Off')}
            <!-- eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -->
          {:else if $contactViewModel.notificationTriggerPolicyOverride.policy === ContactNotificationTriggerPolicy.NEVER}
            {#if $contactViewModel.notificationTriggerPolicyOverride.expiresAt === undefined}
              {$i18n.t('settings.action--do-not-disturb-indefinite', 'Indefinitely')}
            {:else}
              {$i18n.t('settings.action--do-not-disturb-until', 'Until {date}', {
                date: formatDateLocalized(
                  $contactViewModel.notificationTriggerPolicyOverride.expiresAt,
                  $i18n,
                  'auto',
                  $appearance.view.use24hTime,
                ),
              })}
            {/if}
          {:else}
            {unreachable($contactViewModel.notificationTriggerPolicyOverride.policy)}
          {/if}
        </ListElement>
        <!-- TODO(DESK-1163):  When notification policies are respected by the system, show the
      current setting for each contact. -->
        <ListElement
          label={`🐞 ${$i18n.t(
            'settings.label--play-notification-sound',
            'Play Notification Sound',
          )}`}
        >
          {#if $contactViewModel.notificationSoundPolicyOverride === undefined}
            {$i18n.t('settings.action--play-notification-sound-default', 'On')}
          {:else if $contactViewModel.notificationSoundPolicyOverride === NotificationSoundPolicy.MUTED}
            {$i18n.t('settings.action--play-notification-sound-off', 'Off')}
          {:else}
            {unreachable($contactViewModel.notificationSoundPolicyOverride)}
          {/if}
        </ListElement>
        <Divider />
      {/if}
      <Subheader label={$i18n.t('settings.label--privacy', 'Privacy')} />
      <ListElement label={$i18n.t('settings.label--read-receipts', 'Read Receipts')}>
        {#if $contactViewModel.readReceiptPolicyOverride === undefined}
          {$i18n.t('settings.action--control-message-default-send', 'Default (Send)')}
        {:else if $contactViewModel.readReceiptPolicyOverride === ReadReceiptPolicy.SEND_READ_RECEIPT}
          {$i18n.t('settings.action--control-message-send', 'Send')}
        {:else if $contactViewModel.readReceiptPolicyOverride === ReadReceiptPolicy.DONT_SEND_READ_RECEIPT}
          {$i18n.t('settings.action--control-message-do-not-send', "Don't Send")}
        {:else}
          {unreachable($contactViewModel.readReceiptPolicyOverride)}
        {/if}
      </ListElement>
      <!-- TODO(DESK-209): When sending of typing indicators is implemented, show the current
      setting for each contact. -->
      {#if import.meta.env.DEBUG}
        <ListElement
          label={`🐞 ${$i18n.t('settings.label--typing-indicator', 'Typing Indicator')}`}
        >
          {#if $contactViewModel.typingIndicatorPolicyOverride === undefined}
            {$i18n.t('settings.action--control-message-default-send')}
          {:else if $contactViewModel.typingIndicatorPolicyOverride === TypingIndicatorPolicy.SEND_TYPING_INDICATOR}
            {$i18n.t('settings.action--control-message-send')}
          {:else if $contactViewModel.typingIndicatorPolicyOverride === TypingIndicatorPolicy.DONT_SEND_TYPING_INDICATOR}
            {$i18n.t('settings.action--control-message-do-not-send')}
          {:else}
            {unreachable($contactViewModel.typingIndicatorPolicyOverride)}
          {/if}
        </ListElement>
      {/if}
      <Divider />
      <!-- <div class="gallery">
        <LinkElement wip label="Media Gallery">
          <div slot="icon-left" class="icon-photo">
            <MdIcon theme="Outlined">photo</MdIcon>
          </div>
          <MdIcon slot="icon-right" theme="Outlined">navigate_next</MdIcon>
        </LinkElement>
      </div> -->
      <!-- <div class="group-members">
        <LinkElement wip label="Members of these Groups">
          <div slot="icon-left" class="icon-group">
            <MdIcon theme="Outlined">group</MdIcon>
          </div>
          <MdIcon slot="icon-right" theme="Outlined">navigate_next</MdIcon>
        </LinkElement>
      </div> -->
      <!-- <Divider /> -->
      <!-- TODO(DESK-418): Add share of contact -->
      <!-- <LinkElement wip label="Share Contact">
        <MdIcon slot="icon-left" theme="Outlined">share</MdIcon>
      </LinkElement> -->
      <!-- TODO(DESK-419): Add block of contact -->
      <!-- <LinkElement wip label="Block Contact">
        <MdIcon slot="icon-left" theme="Outlined">block</MdIcon>
      </LinkElement> -->
      <!-- TODO(IOS-3686): Re-enable contact deletion
      {#if import.meta.env.BUILD_VARIANT !== 'work'}
        <LinkElement
          on:click={handleClickedOnDeleteContact}
          label={$i18n.t('contacts.action--delete-contact', 'Delete Contact')}
        >
          <MdIcon slot="icon-left" theme="Outlined">delete</MdIcon>
        </LinkElement>
      {/if}
      -->

      <DeleteDialog
        bind:visible={deleteContactDialogVisible}
        on:confirm={deleteContact}
        {displayName}
      />

      <UnableToDeleteDialog bind:visible={unableToDeleteContactDialogVisible} {displayName} />

      {#if contactProfilePictureDialogVisible}
        <ProfilePictureModal
          alt={$i18n.t('contacts.hint--profile-picture', {
            name: $contactViewModel.fullName,
          })}
          color={$profilePicture.view.color}
          initials={$contactViewModel.initials}
          pictureBytes={$profilePicture.view.picture}
          on:close={handleCloseProfilePictureModal}
        />
      {/if}
    {/if}
  </div>

  {#if $contactViewModel !== undefined}
    <VerificationLevelsDialog
      bind:visible={verificationLevelsDialogVisible}
      verificationLevelColors={$contactViewModel.verificationLevelColors}
    />

    <IdentityInformationDialog
      publicKey={$contactViewModel.publicKey}
      bind:visible={identityInformationDialogVisible}
    />
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--cc-t-background-color);

  .aside-contact {
    header {
      display: grid;
      padding: rem(12px) rem(8px);
      grid-template:
        'back title cancel' 100%
        / #{rem(40px)} auto #{rem(40px)};
      grid-auto-flow: column;
      place-items: center;
      user-select: none;

      &[data-display='large'] .back {
        visibility: hidden;
      }

      &:not([data-display='large']) .close {
        visibility: hidden;
      }
    }

    .profile-picture {
      @include def-var($-temp-vars, --cc-t-background-color, var(--t-main-background-color));
      @include def-var(
        $--cc-profile-picture-overlay-background-color: var($-temp-vars, --cc-t-background-color)
      );

      display: grid;
      place-items: center;
      margin: rem(8px) 0;
      --c-profile-picture-size: #{rem(120px)};
      --cc-profile-picture-overlay-badge-size: #{rem(32px)};
      --cc-profile-picture-overlay-badge-icon-size: #{rem(16px)};

      span {
        cursor: pointer;
      }
    }

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

    .name {
      @extend %font-large-400;
      padding: 0 rem(16px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
    }

    .edit {
      @extend %font-small-400;
      display: grid;
      place-items: center;
      color: var(--t-color-primary);
      text-decoration: none;
      user-select: none;

      span {
        cursor: pointer;
      }
    }

    .level {
      --c-verification-dots-size: #{rem(6px)};
    }

    .blocked-icon {
      position: relative;
      top: rem(2px);
    }
  }
</style>
