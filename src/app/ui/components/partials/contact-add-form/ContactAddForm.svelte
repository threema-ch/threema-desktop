<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {globals} from '~/app/globals';
  import StepOne from '~/app/ui/components/partials/contact-add-form/internal/step-one/StepOne.svelte';
  import StepTwo from '~/app/ui/components/partials/contact-add-form/internal/step-two/StepTwo.svelte';
  import type {StepTwoProps} from '~/app/ui/components/partials/contact-add-form/internal/step-two/props';
  import type {ContactAddFormProps} from '~/app/ui/components/partials/contact-add-form/props';
  import type {CurrentStep} from '~/app/ui/components/partials/contact-add-form/types';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {ReceiverType} from '~/common/enum';
  import {isIdentityString} from '~/common/network/types';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = ContactAddFormProps;

  const log = globals.unwrap().uiLogging.logger('ui.component.contact-add-form');

  export let services: $$Props['services'];
  export let actions: $$Props['actions'];

  const {router} = services;

  const dispatch = createEventDispatcher<{contactcreated: undefined}>();

  let identity: string = '';
  let identityFieldError: string | undefined = undefined;

  let currentStep: CurrentStep = {step: 'step-one'};

  async function handleStepOneNextClicked(): Promise<void> {
    if (!isIdentityString(identity)) {
      return;
    }

    try {
      const lookupContactResult = await actions.lookupContact(identity);

      if (lookupContactResult === undefined) {
        return;
      }

      if (lookupContactResult.type === 'me') {
        identityFieldError = $i18n.t(
          'contacts.error--add-contact-threema-id-is-own',
          'You cannot add your own {shortAppName} ID as contact. Hint: To keep private notes you can create a group with only yourself as member.',
          {
            shortAppName: import.meta.env.SHORT_APP_NAME,
          },
        );
        return;
      }

      if (lookupContactResult.type === 'invalid') {
        identityFieldError = $i18n.t(
          'contacts.error--add-contact-threema-id-not-found',
          '{shortAppName} ID was not found or has been revoked',
          {
            shortAppName: import.meta.env.SHORT_APP_NAME,
          },
        );
        return;
      }

      if (lookupContactResult.type === 'exists-direct') {
        identityFieldError = $i18n.t(
          'contacts.error--add-contact-threema-id-already-added',
          '{shortAppName} ID is already part of your contact list',
          {
            shortAppName: import.meta.env.SHORT_APP_NAME,
          },
        );
        return;
      }
      if (lookupContactResult.type === 'exists-in-group') {
        currentStep = {
          step: 'step-two',
          contact: {type: 'existing', uid: lookupContactResult.uid},
        };
        return;
      }
      currentStep = {
        step: 'step-two',
        contact: {type: 'new', contactInit: lookupContactResult.contactInit},
      };
    } catch {
      log.error('Cannot check contact validity. Are you connected to the internet?');
      identityFieldError = i18n
        .get()
        .t(
          'contacts.error--add-contact-threema-id-unable-to-validate',
          'Cannot check contact validity. Are you connected to the internet?',
        );
    }
  }

  async function handleStepTwoNextClicked(
    contact: StepTwoProps['contact'],
    firstName: string,
    lastName: string,
  ): Promise<void> {
    let uid;
    try {
      if (contact.type === 'existing') {
        await actions.updateContactAcquaintanceLevelAndName(contact.uid, {firstName, lastName});
        uid = contact.uid;
      } else {
        // TODO(DESK-1001) Here, a rare edge case can happen when the synced device has added the
        // contact in the meantime. In that case, the contact is not updated with the name. If the
        // contact was added with `AcquaintanceLevel.GROUP_OR_DELETED`, however, the contact will not
        // show up in the list (although it exists). Therefore, we consider the contact addition a
        // failure in that case and prompt the use to try it again.
        const createContactResult = await actions.createContact({
          ...contact.contactInit,
          firstName,
          lastName,
        });

        if (createContactResult === 'race') {
          toast.addSimpleFailure(
            $i18n.t(
              'contacts.error--add-contact-exists-already',
              'Could not create contact, please try again',
            ),
          );
          handleCreationFail();
          return;
        }
        uid = createContactResult;
      }
    } catch {
      toast.addSimpleFailure(
        $i18n.t(
          'contacts.error--add-contact',
          'Unable to add contact. Please check your Internet connection.',
        ),
      );
      handleCreationFail();
      return;
    }

    router.goToConversation({
      receiverLookup: {
        type: ReceiverType.CONTACT,
        uid,
      },
    });
    dispatch('contactcreated');
  }

  function handleClickBackFromStepTwo(): void {
    currentStep = {step: 'step-one'};
    identityFieldError = undefined;
  }

  function handleCreationFail(): void {
    currentStep = {step: 'step-one'};
    identityFieldError = undefined;
  }
</script>

{#if currentStep.step === 'step-one'}
  <StepOne
    handleNextClicked={handleStepOneNextClicked}
    bind:identity
    {identityFieldError}
    on:back
    on:cancel
  />
{:else if currentStep.step === 'step-two'}
  <StepTwo
    {identity}
    handleNextClicked={handleStepTwoNextClicked}
    bind:contact={currentStep.contact}
    on:back={handleClickBackFromStepTwo}
    on:cancel
  />
{:else}
  {unreachable(currentStep)}
{/if}
