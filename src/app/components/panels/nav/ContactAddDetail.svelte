<script lang="ts">
  import {onMount} from 'svelte';

  import WizardButton from '#3sc/components/blocks/Button/WizardButton.svelte';
  import Text from '#3sc/components/blocks/Input/Text.svelte';
  import AvatarUpload from '~/app/components/avatar/AvatarUpload.svelte';
  import HiddenSubmit from '~/app/components/form/HiddenSubmit.svelte';
  import ContactAddNavBar from '~/app/components/navigation/ContactAddNavBar.svelte';
  import {checkContactCreationAllowed} from '~/app/components/panels/nav/contact-add';
  import {assertRoute} from '~/app/routing';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import {type AppServices} from '~/app/types';
  import {
    AcquaintanceLevel,
    ConversationCategory,
    ConversationVisibility,
    ReceiverType,
    SyncState,
    VerificationLevel,
    WorkVerificationLevel,
  } from '~/common/enum';
  import {type ContactInit, type RemoteModelStoreFor} from '~/common/model';
  import {type ContactModelStore} from '~/common/model/contact';
  import {type ValidIdentityData} from '~/common/network/protocol/directory';
  import {idColorIndex} from '~/common/utils/id-color';

  export let services: AppServices;
  const {backend, router} = services;

  let firstName = '';
  let lastName = '';
  let contactFirstnameTextField: Text;

  // Extract identity data from router params
  let identityData: ValidIdentityData;
  $: identityData = assertRoute('nav', $router.nav, ['contactAddDetails']).params.identityData;

  function navigateBack(): void {
    router.replaceNav(
      ROUTE_DEFINITIONS.nav.contactAdd.withTypedParams({identity: identityData.identity}),
    );
  }

  function navigateToContactList(): void {
    router.replaceNav(ROUTE_DEFINITIONS.nav.contactList.withTypedParams(undefined));
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
      // AcquaintanceLevel.GROUP most of the time (i.e. contact exists from a group, but is not
      // shown in the contact list). This is checked in the previous component before allowing to
      // navigate to here. However, under some circumstances (e.g. already synced in another device
      // while on the contact details component) it could happen that acquaintanceLevel is
      // AcquaintanceLevel.DIRECT (i.e. contact already exists in contactlist!). In that case, we
      // simply override existing data (firstname / lastname).
      await contactStore.get().controller.update.fromLocal({
        acquaintanceLevel: AcquaintanceLevel.DIRECT,
        lastName,
        firstName,
      });
    }

    router.go(
      ROUTE_DEFINITIONS.nav.contactList.withTypedParams(undefined),
      ROUTE_DEFINITIONS.main.conversation.withTypedParams({
        receiverLookup: {
          type: ReceiverType.CONTACT,
          uid: contactStore.ctx,
        },
      }),
      undefined,
    );
  }

  async function addContact(): Promise<RemoteModelStoreFor<ContactModelStore>> {
    const contactInit: ContactInit = {
      identity: identityData.identity,
      publicKey: identityData.publicKey,
      firstName,
      lastName,
      nickname: '',
      colorIndex: idColorIndex({type: ReceiverType.CONTACT, identity: identityData.identity}),
      createdAt: new Date(),
      verificationLevel: VerificationLevel.UNVERIFIED,
      workVerificationLevel: WorkVerificationLevel.NONE,
      identityType: identityData.type,
      acquaintanceLevel: AcquaintanceLevel.DIRECT,
      featureMask: identityData.featureMask,
      syncState: SyncState.INITIAL,
      activityState: identityData.state,
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
      void handleAddContact();
    }}
  >
    <HiddenSubmit />
    <div class="bar">
      <ContactAddNavBar on:back={navigateBack} on:cancel={navigateToContactList} />
    </div>
    <span class="avatar-upload">
      <AvatarUpload />
    </span>
    <div class="threema-id">
      <Text disabled={true} value={identityData.identity} label="Threema ID" />
    </div>
    <div class="firstname">
      <Text
        bind:this={contactFirstnameTextField}
        bind:value={firstName}
        label="First Name"
        spellcheck={false}
      />
    </div>
    <div class="lastname">
      <Text bind:value={lastName} label="Last Name" spellcheck={false} />
    </div>

    <div class="next">
      <WizardButton on:click={handleAddContact}>Next</WizardButton>
    </div>
  </form>
</template>

<style lang="scss">
  @use 'component' as *;

  #nav-wrapper {
    display: grid;
    padding: rem(12px) 0 0;
    background-color: var(--t-nav-background-color);
    grid-template:
      'bar' rem(40px)
      'avatar-upload' auto
      'threema-id' auto
      'firstname' auto
      'lastname' auto
      '.' 1fr
      'next' rem(64px);
    gap: rem(8px);
    align-content: start;

    .bar {
      padding: 0 rem(8px) 0 rem(8px);
      display: grid;
    }

    .avatar-upload,
    .threema-id,
    .firstname,
    .lastname {
      padding: 0 rem(16px);
    }
    .avatar-upload {
      place-self: center;
    }

    .next {
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
