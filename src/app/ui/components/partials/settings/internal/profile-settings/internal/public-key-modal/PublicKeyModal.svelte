<script lang="ts">
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {PublicKeyModalProps} from '~/app/ui/components/partials/settings/internal/profile-settings/internal/public-key-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {publicKeyGrid} from '~/common/dom/ui/fingerprint';

  type $$Props = PublicKeyModalProps;

  export let publicKey: $$Props['publicKey'];

  let modalComponent: SvelteNullableBinding<Modal> = null;
  let actionsElement: SvelteNullableBinding<HTMLElement> = null;
  let modalElement: SvelteNullableBinding<HTMLElement> = null;
</script>

<Modal
  bind:this={modalComponent}
  bind:actionsElement
  bind:element={modalElement}
  wrapper={{
    type: 'card',
    actions: [
      {
        iconName: 'close',
        onClick: 'close',
      },
    ],
    title: $i18n.t('settings--profile.label--public-key', 'Public Key'),
    minWidth: 240,
    maxWidth: 240,
  }}
  on:close
>
  <div class="content">
    <pre class="key"><code>{publicKeyGrid(publicKey)}</code></pre>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    padding: 0 rem(16px) rem(16px);

    .key {
      margin: 0;
      line-height: rem(30px);
      color: var(--t-text-e2-color);
      font-size: rem(18px);
      font-weight: 400;
      font-family: 'Lab Grotesque';
      text-align: center;
      letter-spacing: rem(2px);
    }
  }
</style>
