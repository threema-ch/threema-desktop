<script lang="ts">
  import {onMount} from 'svelte';

  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import type {AppServices} from '~/app/types';
  import HiddenSubmit from '~/app/ui/generic/form/HiddenSubmit.svelte';
  import ProfilePictureUpload from '~/app/ui/generic/profile-picture/ProfilePictureUpload.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {checkContactCreationAllowed} from '~/app/ui/nav/contact-add';
  import ContactAddNavBar from '~/app/ui/nav/contact-add/ContactAddNavBar.svelte';
  import WizardButton from '~/app/ui/svelte-components/blocks/Button/WizardButton.svelte';
  import Text from '~/app/ui/svelte-components/blocks/Input/Text.svelte';
  import {
    AcquaintanceLevel,
    ActivityState,
    ConversationCategory,
    ConversationVisibility,
    ReceiverType,
    SyncState,
    VerificationLevel,
    WorkVerificationLevel,
  } from '~/common/enum';
  import type {ContactInit, RemoteModelStoreFor} from '~/common/model';
  import type {ContactModelStore} from '~/common/model/contact';
  import {assertUnreachable} from '~/common/utils/assert';
  import {idColorIndex} from '~/common/utils/id-color';

  export let services: AppServices;
  const {backend, router} = services;

  let firstName = '';
  let lastName = '';
  let contactFirstnameTextField: Text;

  // Extract identity data from router params
  const {identityData} = router.assert('nav', ['contactAddDetails']);

  function navigateBack(): void {
    router.go({
      nav: ROUTE_DEFINITIONS.nav.contactAdd.withParams({identity: identityData.identity}),
    });
  }

  function navigateToContactList(): void {
    router.go({nav: ROUTE_DEFINITIONS.nav.contactList.withoutParams()});
  }

  async function handleAddContact(): Promise<void> {
    if (!checkContactCreationAllowed(backend)) {
      return;
    }
    let contactStore = await backend.model.contacts.getByIdentity(identityData.identity);
    if (contactStore === undefined) {
      contactStore = await addContact();
    } else {
      // Normally when we arrive here contactStore.get().view.acquaintanceLevel will be equal to
      // AcquaintanceLevel.GROUP_OR_DELETED most of the time (i.e. contact exists from a group, but
      // is not shown in the contact list or has been marked as deleted). This is checked in the
      // previous component before allowing to navigate to here. However, under some circumstances
      // (e.g. already synced in another device while on the contact details component) it could
      // happen that acquaintanceLevel is AcquaintanceLevel.DIRECT (i.e. contact already exists in
      // contactlist!). In that case, we simply override existing data (firstname / lastname).
      await contactStore.get().controller.update.fromLocal({
        acquaintanceLevel: AcquaintanceLevel.DIRECT,
        lastName,
        firstName,
      });
    }

    router.goToConversation(
      {
        receiverLookup: {
          type: ReceiverType.CONTACT,
          uid: contactStore.ctx,
        },
      },
      {nav: ROUTE_DEFINITIONS.nav.contactList.withoutParams()},
    );
  }

  async function addContact(): Promise<RemoteModelStoreFor<ContactModelStore>> {
    const contactInit: ContactInit = {
      identity: identityData.identity,
      publicKey: identityData.publicKey,
      firstName,
      lastName,
      nickname: undefined,
      colorIndex: idColorIndex({type: ReceiverType.CONTACT, identity: identityData.identity}),
      createdAt: new Date(),
      verificationLevel: VerificationLevel.UNVERIFIED,
      workVerificationLevel: WorkVerificationLevel.NONE,
      identityType: identityData.type,
      acquaintanceLevel: AcquaintanceLevel.DIRECT,
      featureMask: identityData.featureMask,
      syncState: SyncState.INITIAL,
      activityState: identityData.state ?? ActivityState.ACTIVE,
      category: ConversationCategory.DEFAULT,
      visibility: ConversationVisibility.SHOW,
    };

    return await backend.model.contacts.add.fromLocal(contactInit);
  }

  onMount(() => {
    contactFirstnameTextField.focus();
  });
</script>

<template>
  <form
    id="nav-wrapper"
    on:submit|preventDefault={() => {
      handleAddContact().catch(assertUnreachable);
    }}
  >
    <HiddenSubmit />
    <div class="bar">
      <ContactAddNavBar on:back={navigateBack} on:cancel={navigateToContactList} />
    </div>

    <div class="content">
      <span class="profile-picture-upload">
        <ProfilePictureUpload />
      </span>
      <div class="threema-id">
        <Text
          disabled={true}
          value={identityData.identity}
          label={$i18n.t('contacts.label--threema-id')}
        />
      </div>
      <div class="firstname">
        <Text
          bind:this={contactFirstnameTextField}
          bind:value={firstName}
          label={$i18n.t('contacts.label--first-name', 'First Name')}
          spellcheck={false}
        />
      </div>
      <div class="lastname">
        <Text
          bind:value={lastName}
          label={$i18n.t('contacts.label--last-name', 'Last Name')}
          spellcheck={false}
        />
      </div>
    </div>

    <div class="next">
      <WizardButton on:click={handleAddContact}
        >{$i18n.t('contacts.action--add-contact-next')}</WizardButton
      >
    </div>
  </form>
</template>

<style lang="scss">
  @use 'component' as *;

  #nav-wrapper {
    display: grid;
    background-color: var(--t-nav-background-color);
    grid-template:
      'bar' rem(64px)
      'content' auto
      '.' 1fr
      'next' rem(64px);
    align-content: start;
    overflow: hidden;

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
      .threema-id,
      .firstname,
      .lastname {
        padding: 0 rem(16px);
      }
      .profile-picture-upload {
        place-self: center;
      }
    }

    .next {
      grid-area: next;

      display: grid;
      grid-area: next;
      background-color: var(--t-color-primary);
      align-self: stretch;
      grid-template: 'text' / auto;
      justify-items: end;
      align-items: center;
      padding: 0 rem(8px);
    }
  }
</style>
