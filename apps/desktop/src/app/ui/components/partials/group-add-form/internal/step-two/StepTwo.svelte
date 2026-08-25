<script lang="ts">
  import {UTF8} from '@threema/ts-utils/codec/utf8';
  import {TIMER} from '@threema/ts-utils/timer/global-timer';
  import {onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import Avatar from '~/app/ui/components/atoms/avatar/Avatar.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {StepTwoProps} from '~/app/ui/components/partials/group-add-form/internal/step-two/props';
  import TopBar from '~/app/ui/components/partials/group-add-form/internal/top-bar/TopBar.svelte';
  import EditPictureModal from '~/app/ui/components/partials/modals/edit-picture-modal/EditPictureModal.svelte';
  import ReceiverPreviewList from '~/app/ui/components/partials/receiver-preview-list/ReceiverPreviewList.svelte';
  import type {ReceiverPreviewListProps} from '~/app/ui/components/partials/receiver-preview-list/props';
  import HiddenSubmit from '~/app/ui/generic/form/HiddenSubmit.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import WizardButton from '~/app/ui/svelte-components/blocks/Button/WizardButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import TextInput from '~/app/ui/svelte-components/blocks/Input/Text.svelte';
  import {MAX_GROUP_NAME_BYTES} from '~/app/ui/utils/constants';
  import type {ProfilePictureBlobStoreValue} from '~/common/dom/ui/profile-picture';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';
  import {WritableStore} from '~/common/utils/store';
  import {isContactReceiverData} from '~/common/viewmodel/utils/receiver';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.group-create-form-step-two');

  let {
    contacts,
    groupName = $bindable(),
    onclickback,
    onclickcancel,
    oncontinue,
    placeholderColor = 'teal',
    selectedMembers,
    services,
  }: StepTwoProps = $props();

  let modalState = $state<'none' | 'edit-picture'>('none');

  const profilePictureStore = $state<WritableStore<ProfilePictureBlobStoreValue>>(
    new WritableStore<ProfilePictureBlobStoreValue>(undefined),
  );

  let groupNameComponent: TextInput;
  let groupNameByteLength = $state(0);

  let continueButtonDisabled = $state(false);

  const handleMutation = TIMER.debounce(
    () => (groupNameByteLength = UTF8.encode(groupName).byteLength),
    200,
    true,
  );

  const filteredContacts = $derived<ReceiverPreviewListProps<unknown>['items']>(
    contacts.filter((contactStore) => {
      const contact = contactStore.get();
      return (
        isContactReceiverData(contact.receiver) && selectedMembers.has(contact.receiver.lookup.uid)
      );
    }),
  );

  async function setProfilePictureStore(blob: Blob | undefined): Promise<void> {
    if (blob === undefined) {
      profilePictureStore.set(blob);
      return;
    }

    let bitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch (error) {
      log.error('Bitmap could not be created: ', error);
      toast.addSimpleFailure(
        $i18n.t(
          'groups.error--pick-profile-picture',
          'An error ocurred when picking the profile picture',
        ),
      );
      return;
    }

    profilePictureStore.set({
      blob,
      dimensions: {height: bitmap.height, width: bitmap.width},
    });

    bitmap.close();
  }

  onMount(() => {
    groupNameComponent.focus();
  });
</script>

<form
  class="container"
  onsubmit={(event) => {
    event.preventDefault();
    continueButtonDisabled = true;
    oncontinue(groupName, profilePictureStore.get()?.blob)
      .then(() => (continueButtonDisabled = false))
      .catch(assertUnreachable);
  }}
>
  <HiddenSubmit />
  <div class="bar">
    <TopBar {onclickcancel} />
  </div>

  <div class="content">
    <span class="profile-picture-upload">
      {#if $profilePictureStore?.blob === undefined}
        <div class="avatar" data-color={placeholderColor}>
          <span class="placeholder"><MdIcon theme="Outlined">add_a_photo</MdIcon></span>
        </div>
      {:else}
        <Avatar
          color={placeholderColor}
          initials=""
          byteStore={profilePictureStore}
          size={120}
          description={$i18n.t('groups.hint--new-group-picture', 'Group profile picture')}
          isClickable={false}
        />
      {/if}

      <button
        class="edit"
        onclick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          modalState = 'edit-picture';
        }}
      >
        <Text
          color="inherit"
          family="secondary"
          size="body-small"
          text={$i18n.t('common.action--edit', 'Edit')}
        />
      </button>
    </span>
    <div class="groupname">
      <TextInput
        bind:this={groupNameComponent}
        bind:value={groupName}
        oninput={handleMutation}
        label={$i18n.t('groups.label--group-name', 'Group Name')}
        spellcheck={false}
      />
    </div>
    <div class="list">
      <div class="heading">
        {$i18n.t(
          'groups.label--group-members',
          '{n, plural, =0 {No Group Members} =1 {Group Member} other {Group Members}}',
          {n: filteredContacts.length},
        )}
      </div>
      {#if filteredContacts.length > 0}
        <ReceiverPreviewList items={filteredContacts} {services} />
      {/if}
    </div>
  </div>
  <div class="footer">
    <WizardButton onclick={onclickback}>
      {$i18n.t('common.action--back', 'Back')}
    </WizardButton>

    <WizardButton
      onclick={() => {
        continueButtonDisabled = true;
        oncontinue(groupName, profilePictureStore.get()?.blob)
          .then(() => (continueButtonDisabled = false))
          .catch(assertUnreachable);
      }}
      disabled={groupNameByteLength > MAX_GROUP_NAME_BYTES || continueButtonDisabled}
    >
      {$i18n.t('common.action--next', 'Next')}
    </WizardButton>
  </div>
</form>

{#if modalState === 'none'}
  <!--No modal to show.-->
{:else if modalState === 'edit-picture'}
  <EditPictureModal
    blob={profilePictureStore.get()?.blob}
    color={placeholderColor}
    onsubmit={async (blob) => {
      await setProfilePictureStore(blob);
      modalState = 'none';
    }}
    placeholder={{type: 'icon', name: 'add_a_photo'}}
    title={$i18n.t('groups.label--edit-picture', 'Edit Group Picture')}
    onclose={() => (modalState = 'none')}
  />
{:else}
  {unreachable(modalState)}
{/if}

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    background-color: var(--t-nav-background-color);
    grid-template:
      'bar' rem(64px)
      'content' auto
      '.' 1fr
      'footer' rem(64px);
    align-content: start;
    overflow: hidden;
    height: 100%;

    .bar {
      grid-area: bar;

      padding: rem(12px) rem(8px);
    }

    .content {
      grid-area: content;

      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: start;
      gap: rem(8px);

      .profile-picture-upload,
      .groupname {
        padding: 0 rem(16px);
      }
      .profile-picture-upload {
        display: flex;
        flex-direction: column;
        place-self: center;

        .avatar {
          border-radius: 50%;
          width: rem(120px);
          height: rem(120px);

          @each $color in map-get-req($config, profile-picture-colors) {
            &[data-color='#{$color}'] {
              color: var(--c-profile-picture-initials-#{$color}, default);
              background-color: var(--c-profile-picture-background-#{$color}, default);
            }
          }

          .placeholder {
            font-size: rem(24px);
            display: flex;
            place-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            text-transform: uppercase;
          }
        }

        .edit {
          @extend %neutral-input;
          color: var(--t-color-primary);
          cursor: pointer;
        }
      }
      .list {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: start;

        .heading {
          @extend %font-small-400;

          color: var(--t-text-e2-color);
          padding: rem(10px) rem(16px);
        }
      }
    }

    .footer {
      grid-area: footer;

      display: flex;
      align-self: stretch;
      align-items: center;
      justify-content: space-between;

      background-color: var(--t-color-primary);
      padding: 0 rem(8px);
    }
  }
</style>
