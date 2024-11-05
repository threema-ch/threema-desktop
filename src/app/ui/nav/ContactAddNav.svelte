<script lang="ts">
  import {onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import type {AppServices} from '~/app/types';
  import HiddenSubmit from '~/app/ui/generic/form/HiddenSubmit.svelte';
  import IconText from '~/app/ui/generic/menu/item/IconText.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ContactAddNavBar from '~/app/ui/nav/contact-add/ContactAddNavBar.svelte';
  import WizardButton from '~/app/ui/svelte-components/blocks/Button/WizardButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import Text from '~/app/ui/svelte-components/blocks/Input/Text.svelte';
  import {AcquaintanceLevel, ActivityState} from '~/common/enum';
  import type {ValidIdentityData} from '~/common/network/protocol/directory';
  import {isIdentityString} from '~/common/network/types';
  import {assertUnreachable} from '~/common/utils/assert';

  const log = globals.unwrap().uiLogging.logger('ui.component.contact-add-nav');

  export let services: AppServices;
  const {backend, router} = services;

  const params = router.assert('nav', ['contactAdd']);

  let identity = params.identity ?? '';
  let identityFieldError: string | undefined = undefined;
  let threemaIdTextField: Text;

  $: {
    // Force uppercase
    identity = identity.toUpperCase();

    // Reset error message
    identityFieldError = undefined;
  }

  function navigateToReceiverList(): void {
    router.go({nav: ROUTE_DEFINITIONS.nav.receiverList.withoutParams()});
  }

  function navigateToContactDetails(identityData: ValidIdentityData): void {
    router.go({nav: ROUTE_DEFINITIONS.nav.contactAddDetails.withParams({identityData})});
  }

  async function handleNextClicked(): Promise<void> {
    if (!isIdentityString(identity)) {
      return;
    }

    if (identity === services.backend.user.identity) {
      identityFieldError = i18n
        .get()
        .t(
          'contacts.error--add-contact-threema-id-is-own',
          'You cannot add your own Threema ID as contact. Hint: To keep private notes you can create a group with only yourself as member.',
        );
      return;
    }

    try {
      // Lookup identity in directory
      const identityData = await backend.directory.identity(identity);

      if (identityData.state === ActivityState.INVALID) {
        identityFieldError = i18n
          .get()
          .t(
            'contacts.error--add-contact-threema-id-not-found',
            'Threema ID was not found or has been revoked',
          );
        return;
      }

      // Lookup identity in contact store
      const contactStore = await backend.model.contacts.getByIdentity(identity);

      if (
        contactStore === undefined ||
        contactStore.get().view.acquaintanceLevel === AcquaintanceLevel.GROUP_OR_DELETED
      ) {
        navigateToContactDetails(identityData);
      } else {
        const message = i18n
          .get()
          .t(
            'contacts.error--add-contact-threema-id-already-added',
            'Threema ID is already part of your contact list',
          );

        log.error(message);
        identityFieldError = message;
        // TODO(DESK-361): forward to contact edit of existing identity (?)
      }
    } catch (error) {
      log.error('Cannot check contact validity. Are you connected to the internet?');
      identityFieldError = i18n
        .get()
        .t(
          'contacts.error--add-contact-threema-id-unable-to-validate',
          'Cannot check contact validity. Are you connected to the internet?',
        );
    }
  }

  onMount(() => {
    threemaIdTextField.focus();
  });
</script>

<template>
  <form
    id="nav-wrapper"
    on:submit|preventDefault={() => {
      handleNextClicked().catch(assertUnreachable);
    }}
  >
    <HiddenSubmit />
    <div class="bar">
      <ContactAddNavBar on:back={navigateToReceiverList} on:cancel={navigateToReceiverList} />
    </div>
    <div class="content">
      <span class="note-enter"
        >{$i18n.t(
          'contacts.prose--add-contact-instructions',
          'Please enter the Threema ID of the contact you would like to add:',
        )}
      </span>
      <div class="threema-id">
        <Text
          bind:this={threemaIdTextField}
          bind:value={identity}
          error={identityFieldError}
          label={$i18n.t('contacts.label--threema-id')}
          spellcheck={false}
        />
      </div>
      <!-- <div
        class="qr-scan"
        on:click={() => {
          // eslint-disable-next-line no-alert
          alert('Not yet implemented (DESK-387)');
        }}
      >
        <IconText>
          <div slot="icon" class="icon wip">
            <MdIcon theme="Filled">qr_code_scanner</MdIcon>
          </div>
          <div slot="text" class="wip">Scan Threema ID</div>
        </IconText>
      </div> -->
      {#if import.meta.env.BUILD_VARIANT === 'work'}
        <hr />
        <span class="note-directory">
          {$i18n.t(
            'contacts.prose--add-contact-instructions-work-directory',
            'Or search a contact in corporate directory and add it to your personal contact list:',
          )}
        </span>
        <button
          class="add-contact"
          on:click={() => {
            // eslint-disable-next-line no-alert
            alert('Not yet implemented (DESK-388)');
          }}
        >
          <IconText>
            <div slot="icon" class="icon">
              <MdIcon theme="Filled">add</MdIcon>
            </div>
            <div slot="text">
              {$i18n.t(
                'contacts.action--add-contact-from-work-directory',
                'Add Contact from Directory',
              )}
            </div>
          </IconText>
        </button>
      {/if}
    </div>

    <div class="next">
      <WizardButton disabled={!isIdentityString(identity)} on:click={handleNextClicked}>
        {$i18n.t('contacts.action--add-contact-next', 'Next')}
      </WizardButton>
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

      .note-enter,
      .note-directory {
        padding: rem(4px) rem(16px) 0;
      }

      .add-contact {
        @extend %neutral-input;
      }

      .threema-id,
      .add-contact {
        padding: 0 rem(16px);
      }

      .icon {
        display: grid;
        place-items: center;
        color: var(--t-color-primary);
      }

      span {
        color: var(--t-text-e2-color);
      }

      hr {
        border: none;
        border-top: rem(1px) solid rgba(#000000, 12%);
        overflow: visible;
        text-align: center;
        margin: rem(8px) rem(8px);
        width: calc(100% - rem(32px));
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
