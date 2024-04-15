<!--
  @component Renders a modal with details about verification levels.
-->
<script lang="ts">
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {VerificationLevelInfoModalProps} from '~/app/ui/components/partials/modals/verification-level-info-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import VerificationDots from '~/app/ui/svelte-components/threema/VerificationDots/VerificationDots.svelte';

  type $$Props = VerificationLevelInfoModalProps;

  export let colors: $$Props['colors'];
</script>

<Modal
  wrapper={{
    type: 'card',
    actions: [
      {
        iconName: 'close',
        onClick: 'close',
      },
    ],
    title: $i18n.t('dialog--verification-levels.label--title', 'Verification Levels'),
  }}
  on:close
>
  <div class="content">
    <div class="intro">
      {$i18n.t(
        'dialog--verification-levels.prose--intro',
        'The dots are an indicator for a contact`s verification level.',
      )}
    </div>

    <div class="level">
      <span class="dots">
        <VerificationDots {colors} verificationLevel="unverified" />
      </span>

      <span>
        {$i18n.t(
          'dialog--verification-levels.prose--level-unverified',
          'The ID and public key have been obtained from the server because you received a message from this contact for the first time or added the ID manually. No matching contact was found in your address book (by phone number or email), and therefore you cannot be sure that the person is who they claim to be in their messages.',
        )}
      </span>
    </div>

    <div class="level">
      <span class="dots">
        <VerificationDots {colors} verificationLevel="server-verified" />
      </span>

      <span>
        {#if colors === 'default'}
          {$i18n.t(
            'dialog--verification-levels.prose--level-server-verified-default',
            'The ID has been matched with a contact in your address book (by phone number or email). Since the server verifies phone numbers and email addresses, you can be reasonably sure that the person is who they claim to be.',
          )}
        {:else if colors === 'shared-work-subscription'}
          {$i18n.t(
            'dialog--verification-levels.prose--level-server-verified-work',
            'This verification level is only available in Threema Work; it indicates that the Threema ID belongs to an internal company contact.',
          )}
        {/if}
      </span>
    </div>

    <div class="level">
      <span class="dots">
        <VerificationDots {colors} verificationLevel="fully-verified" />
      </span>
      {#if colors === 'default'}
        {$i18n.t(
          'dialog--verification-levels.prose--level-fully-verified-default',
          'You have personally verified the ID and public key of the person by scanning their QR code. Assuming their device has not been hijacked, you can be very sure that messages from this contact were really written by the person that they indicate.',
        )}
      {:else if colors === 'shared-work-subscription'}
        {$i18n.t(
          'dialog--verification-levels.prose--level-fully-verified-work',
          'This verification level is only available in Threema Work; it indicates that the Threema ID belongs to an internal contact whose ID and public key you have verified by scanning their QR code.',
        )}
      {/if}
      <span />
    </div>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    @extend %font-normal-400;

    padding: 0 rem(16px);

    .intro {
      margin-bottom: rem(16px);
    }

    .level {
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
