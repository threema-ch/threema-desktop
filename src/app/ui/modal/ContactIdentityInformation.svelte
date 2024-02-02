<script lang="ts">
  import {i18n} from '~/app/ui/i18n';
  import ModalWrapper from '~/app/ui/modal/ModalWrapper.svelte';
  import TitleAndClose from '~/app/ui/svelte-components/blocks/ModalDialog/Header/TitleAndClose.svelte';
  import ModalDialog from '~/app/ui/svelte-components/blocks/ModalDialog/ModalDialog.svelte';
  import type {PublicKey} from '~/common/crypto';
  import {publicKeyGrid} from '~/common/dom/ui/fingerprint';

  export let visible: boolean;

  export let publicKey: PublicKey;
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
        title={$i18n.t('dialog--id-information.label--title', 'Threema ID')}
      />
      <div class="body" slot="body">
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
        <span class="public_key"
          >{$i18n.t('dialog--id-information.label--public-key', 'Public Key')}</span
        >
        <pre><code>{publicKeyGrid(publicKey)}</code></pre>
      </div>
    </ModalDialog>
  </ModalWrapper>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    @extend %font-normal-400;
    padding: rem(16px);
    max-width: rem(480px);

    .public_key {
      @extend %font-meta-400;
      color: var(--t-text-e2-color);
    }
  }
</style>
