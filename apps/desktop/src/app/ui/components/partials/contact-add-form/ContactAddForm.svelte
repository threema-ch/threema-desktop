<script lang="ts">
  import {UTF8} from '@threema/ts-utils/codec/utf8';

  import {globals} from '~/app/globals';
  import StepOne from '~/app/ui/components/partials/contact-add-form/internal/step-one/StepOne.svelte';
  import StepTwo from '~/app/ui/components/partials/contact-add-form/internal/step-two/StepTwo.svelte';
  import type {StepTwoProps} from '~/app/ui/components/partials/contact-add-form/internal/step-two/props';
  import type {ContactAddFormProps} from '~/app/ui/components/partials/contact-add-form/props';
  import type {CurrentStep} from '~/app/ui/components/partials/contact-add-form/types';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import {MAX_CONTACT_NAME_BYTES} from '~/app/ui/utils/constants';
  import {svelteUnreachable} from '~/app/ui/utils/svelte';
  import {ReceiverType} from '~/common/enum';
  import {isIdentityString} from '~/common/network/types';
  import {unwrap} from '~/common/utils/assert';

  const log = globals.unwrap().uiLogging.logger('ui.component.contact-add-form');

  const {
    actions,
    services,
    onclickcancel,
    onclickformcancel,
    oncreatesuccess,
  }: ContactAddFormProps = $props();
  const {router} = services;

  let identity = $state<string>('');
  let identityFieldError = $state<string | undefined>(undefined);
  let currentStep = $state<CurrentStep>({step: 'step-one'});

  async function handleContinueStepOne(): Promise<void> {
    if (import.meta.env.BUILD_MODE === 'testing') {
      // In case the user passes a delimitator, we expect the user to want to
      // add multiple new contacts in on go.
      if (identity.includes(',')) {
        const identities = identity.split(',').filter(isIdentityString);
        const lookupContactResults = await actions.lookupContact(new Set(identities));

        if (lookupContactResults === undefined || lookupContactResults.length === 0) {
          return;
        }

        for (const contact of lookupContactResults) {
          if (contact.type === 'new') {
            await actions.createContact({
              ...contact.contactInit,
            });
          }
        }
        oncreatesuccess?.();
        return;
      }
    }

    if (!isIdentityString(identity)) {
      return;
    }

    try {
      const lookupContactResult = await actions.lookupContact(new Set([identity]));
      if (lookupContactResult === undefined || lookupContactResult.length === 0) {
        return;
      }

      const contactResult = unwrap(lookupContactResult[0]);

      if (contactResult.type === 'me') {
        identityFieldError = $i18n.t(
          'contacts.error--add-contact-threema-id-is-own',
          'You cannot add your own {shortAppName} ID as contact. Hint: To keep private notes you can create a group with only yourself as member.',
          {
            shortAppName: import.meta.env.SHORT_APP_NAME,
          },
        );
        return;
      }

      if (contactResult.type === 'invalid') {
        identityFieldError = $i18n.t(
          'contacts.error--add-contact-threema-id-not-found',
          '{shortAppName} ID was not found or has been revoked',
          {
            shortAppName: import.meta.env.SHORT_APP_NAME,
          },
        );
        return;
      }

      if (contactResult.type === 'exists-direct') {
        identityFieldError = $i18n.t(
          'contacts.error--add-contact-threema-id-already-added',
          '{shortAppName} ID is already part of your contact list',
          {
            shortAppName: import.meta.env.SHORT_APP_NAME,
          },
        );
        return;
      }
      if (contactResult.type === 'exists-in-group') {
        currentStep = {
          step: 'step-two',
          contact: {type: 'existing', uid: contactResult.uid},
        };
        return;
      }
      currentStep = {
        step: 'step-two',
        contact: {type: 'new', contactInit: contactResult.contactInit},
      };
    } catch {
      log.error('Cannot check contact validity. Are you connected to the internet?');
      identityFieldError = $i18n.t(
        'contacts.error--add-contact-threema-id-unable-to-validate',
        'Cannot check contact validity. Are you connected to the internet?',
      );
    }
  }

  async function handleContinueStepTwo(
    contact: StepTwoProps['contact'],
    firstName: string,
    lastName: string,
  ): Promise<void> {
    if (
      UTF8.encode(firstName).byteLength > MAX_CONTACT_NAME_BYTES ||
      UTF8.encode(lastName).byteLength > MAX_CONTACT_NAME_BYTES
    ) {
      return;
    }
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
    oncreatesuccess?.();
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
    bind:identity
    {identityFieldError}
    onformcontinue={() => {
      handleContinueStepOne().catch((error) => {
        log.error(`Failed to continue in step one: ${error}`);
      });
    }}
    {onclickcancel}
    {onclickformcancel}
  />
{:else if currentStep.step === 'step-two'}
  <StepTwo
    bind:contact={currentStep.contact}
    {identity}
    onclickback={handleClickBackFromStepTwo}
    {onclickcancel}
    onformcontinue={(...data) => {
      handleContinueStepTwo(...data).catch((error) => {
        log.error(`Failed to continue in step two: ${error}`);
      });
    }}
  />
{:else}
  {svelteUnreachable(currentStep)}
{/if}
