<script lang="ts">
  import {globals} from '~/app/globals';
  import Input from '~/app/ui/components/atoms/input/Input.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {EditContactModalProps} from '~/app/ui/components/partials/modals/edit-contact-modal/props';
  import ProfilePicture from '~/app/ui/components/partials/profile-picture/ProfilePicture.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.edit-contact-modal');

  type $$Props = EditContactModalProps;

  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];

  let modalComponent: SvelteNullableBinding<Modal> = null;

  let firstNameInputValue = receiver.firstName;
  let lastNameInputValue = receiver.lastName;

  async function handleSubmit(): Promise<void> {
    await receiver
      .edit({
        type: 'contact',
        firstName: firstNameInputValue,
        lastName: lastNameInputValue,
      })
      .then(() => {
        toast.addSimpleSuccess(
          $i18n.t('dialog--edit-contact.success--edit-contact', 'Contact successfully edited'),
        );
      })
      .catch((error: unknown) => {
        log.error(`Failed to update contact: ${error}`);

        toast.addSimpleFailure(
          $i18n.t('dialog--edit-contact.error--edit-contact', 'Failed to edit contact'),
        );
      });

    modalComponent?.close();
  }
</script>

<Modal
  bind:this={modalComponent}
  wrapper={{
    type: 'card',
    actions: [
      {
        iconName: 'close',
        onClick: 'close',
      },
    ],
    buttons: [
      {
        label: $i18n.t('dialog--edit-contact.action--cancel', 'Cancel'),
        type: 'naked',
        onClick: 'close',
      },
      {
        label: $i18n.t('dialog--edit-contact.action--confirm', 'OK'),
        onClick: 'submit',
        type: 'filled',
      },
    ],
    title: $i18n.t('dialog--edit-contact.label--title', 'Edit {name}', {
      name: receiver.name,
    }),
    maxWidth: 460,
  }}
  options={{
    allowSubmittingWithEnter: true,
  }}
  on:submit={handleSubmit}
  on:close
>
  <div class="content">
    <div class="profile-picture">
      <ProfilePicture
        {receiver}
        {services}
        options={{
          isClickable: false,
        }}
        size="lg"
      />
    </div>

    <div class="inputs">
      <Input
        bind:value={firstNameInputValue}
        autofocus
        id="first-name"
        label={$i18n.t('dialog--edit-contact.label--first-name', 'First Name')}
      />
      <Input
        bind:value={lastNameInputValue}
        autofocus
        id="last-name"
        label={$i18n.t('dialog--edit-contact.label--last-name', 'Last Name')}
      />
    </div>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: start;
    gap: rem(16px);

    padding: 0 rem(16px);

    .profile-picture {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
    }

    .inputs {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: start;
      gap: rem(8px);
    }
  }
</style>
