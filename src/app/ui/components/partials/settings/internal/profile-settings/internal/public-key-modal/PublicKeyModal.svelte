<script lang="ts">
  import {onDestroy, onMount} from 'svelte';

  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {PublicKeyModalProps} from '~/app/ui/components/partials/settings/internal/profile-settings/internal/public-key-modal/props';
  import {nodeIsOrContainsTarget} from '~/app/ui/utils/node';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {publicKeyGrid} from '~/common/dom/ui/fingerprint';

  type $$Props = PublicKeyModalProps;
  export let publicKey: $$Props['publicKey'];
  let modalComponent: SvelteNullableBinding<Modal> = null;

  let actionsElement: SvelteNullableBinding<HTMLElement> = null;
  let modalElement: SvelteNullableBinding<HTMLElement> = null;
  let renderedPkElement: SvelteNullableBinding<HTMLElement> = null;

  function handleOutsideClick(event: MouseEvent): void {
    if (
      !nodeIsOrContainsTarget(renderedPkElement, event.target) &&
      !nodeIsOrContainsTarget(actionsElement, event.target)
    ) {
      modalComponent?.close();
    }
  }

  onMount(() => {
    modalElement?.addEventListener('click', handleOutsideClick);
  });

  onDestroy(() => {
    modalElement?.removeEventListener('click', handleOutsideClick);
  });
</script>

<template>
  <Modal
    bind:this={modalComponent}
    bind:actionsElement
    bind:element={modalElement}
    wrapper={{
      type: 'none',
      actions: [
        {
          iconName: 'close',
          onClick: 'close',
        },
      ],
    }}
    on:close
  >
    <div class="content">
      <div bind:this={renderedPkElement}>
        <pre><code>{publicKeyGrid(publicKey)}</code></pre>
      </div>
    </div>
  </Modal>
</template>
