<script lang="ts">
  import TitleAndClose from '#3sc/components/blocks/ModalDialog/Header/TitleAndClose.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {type VerificationLevelColors} from '#3sc/components/threema/VerificationDots';
  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';

  export let visible: boolean;

  export let verificationLevelColors: VerificationLevelColors;
</script>

<template>
  <ModalWrapper {visible}>
    <ModalDialog
      bind:visible
      on:confirm
      on:close={() => (visible = false)}
      on:cancel={() => (visible = false)}
    >
      <TitleAndClose
        let:modal
        {modal}
        slot="header"
        title={$i18n.t('dialog--verification-levels.label--title', 'Verification Levels')}
      />
      <div class="body" slot="body">
        <div class="main_desc">
          {$i18n.t(
            'dialog--verification-levels.prose--intro',
            'The dots are an indicator for a contact`s verification level.',
          )}
        </div>

        <div class="dot-explain">
          <span class="dots">
            <VerificationDots colors={verificationLevelColors} verificationLevel="unverified" />
          </span>

          <span>
            {$i18n.t(
              'dialog--verification-levels.prose--level-unverified',
              'The ID and public key have been obtained from the server because you received a message from this contact for the first time or added the ID manually. No matching contact was found in your address book (by phone number or email), and therefore you cannot be sure that the person is who they claim to be in their messages.',
            )}
          </span>
        </div>

        <div class="dot-explain">
          <span class="dots">
            <VerificationDots
              colors={verificationLevelColors}
              verificationLevel="server-verified"
            />
          </span>

          <span>
            {#if verificationLevelColors === 'default'}
              {$i18n.t(
                'dialog--verification-levels.prose--level-server-verified-default',
                'The ID has been matched with a contact in your address book (by phone number or email). Since the server verifies phone numbers and email addresses, you can be reasonably sure that the person is who they claim to be.',
              )}
            {:else if verificationLevelColors === 'shared-work-subscription'}
              {$i18n.t(
                'dialog--verification-levels.prose--level-server-verified-work',
                'This verification level is only available in Threema Work; it indicates that the Threema ID belongs to an internal company contact.',
              )}
            {/if}
          </span>
        </div>

        <div class="dot-explain">
          <span class="dots">
            <VerificationDots colors={verificationLevelColors} verificationLevel="fully-verified" />
          </span>
          {#if verificationLevelColors === 'default'}
            {$i18n.t(
              'dialog--verification-levels.prose--level-fully-verified-default',
              'You have personally verified the ID and public key of the person by scanning their QR code. Assuming their device has not been hijacked, you can be very sure that messages from this contact were really written by the person that they indicate.',
            )}
          {:else if verificationLevelColors === 'shared-work-subscription'}
            {$i18n.t(
              'dialog--verification-levels.prose--level-fully-verified-work',
              'This verification level is only available in Threema Work; it indicates that the Threema ID belongs to an internal contact whose ID and public key you have verified by scanning their QR code.',
            )}
          {/if}
          <span />
        </div>
      </div>
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    @extend %font-normal-400;
    padding: rem(16px);

    .main_desc {
      margin-bottom: rem(16px);
    }

    .dot-explain {
      display: grid;
      grid-template: 'dots text' auto / min-content minmax(#{rem(100px)}, #{rem(480px)});
      column-gap: rem(16px);
      margin-bottom: rem(16px);

      .dots {
        margin-top: rem(2px);
      }
    }
  }
</style>
