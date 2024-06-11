<!--
  @component Renders a modal with details about Threema IDs.
-->
<script lang="ts">
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {ThreemaIdInfoInfoModalProps} from '~/app/ui/components/partials/modals/threema-id-info-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import {publicKeyGrid} from '~/common/dom/ui/fingerprint';

  type $$Props = ThreemaIdInfoInfoModalProps;

  export let publicKey: $$Props['publicKey'] = undefined;
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
    title: $i18n.t('dialog--id-information.label--title', 'Threema ID'),
    maxWidth: 520,
  }}
  on:close
>
  <div class="content">
    <p>
      {$i18n.t(
        'dialog--id-information.prose--threema-id-description-p1',
        'Each Threema user gets a randomly generated, 8-digit Threema ID when starting the app for the first time. This ID is your unique address in Threema and makes it possible to use Threema completely anonymously, without disclosing any personal information.',
      )}
    </p>
    <p>
      {$i18n.t(
        'dialog--id-information.prose--threema-id-description-p2',
        "Your Threema ID is just one of two components that make up your identity in Threema. The other one is the so called key pair (consisting of a public key and a private key) which is essential for the encryption. Your Threema ID is permanently tied to your public key. While the public key is sent to Threema's servers to be distributed to your chat partners, the private key remains on your device where it is securely stored. All messages directed to you will be individually encrypted with your public key on the sender's device. They can only be decrypted with your personal private key.",
      )}
    </p>
    {#if publicKey !== undefined}
      <span class="public-key"
        >{$i18n.t('dialog--id-information.label--public-key', 'Public Key')}</span
      >
      <pre><code>{publicKeyGrid(publicKey)}</code></pre>
    {/if}
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    @extend %font-normal-400;

    padding: 0 rem(16px);

    .public-key {
      @extend %font-meta-400;

      color: var(--t-text-e2-color);
    }
  }
</style>
