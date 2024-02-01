<!--
  @component
  Renders a modal to view a profile picture in full size.
-->
<script lang="ts">
  import {onDestroy, onMount} from 'svelte';

  import ProfilePicture from '~/app/ui/svelte-components/threema/ProfilePicture/ProfilePicture.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import type {ProfilePictureModalProps} from '~/app/ui/components/partials/modals/profile-picture-modal/props';
  import {nodeIsOrContainsTarget} from '~/app/ui/utils/node';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {transformProfilePicture} from '~/common/dom/ui/profile-picture';

  type $$Props = ProfilePictureModalProps;

  export let alt: $$Props['alt'];
  export let color: $$Props['color'];
  export let initials: $$Props['initials'];
  export let pictureBytes: $$Props['pictureBytes'] = undefined;

  let modalComponent: SvelteNullableBinding<Modal> = null;

  let actionsElement: SvelteNullableBinding<HTMLElement> = null;
  let modalElement: SvelteNullableBinding<HTMLElement> = null;
  let profilePictureElement: SvelteNullableBinding<HTMLElement> = null;

  function handleOutsideClick(event: MouseEvent): void {
    if (
      !nodeIsOrContainsTarget(profilePictureElement, event.target) &&
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
    <div bind:this={profilePictureElement} class="profile-picture">
      <ProfilePicture
        img={transformProfilePicture(pictureBytes)}
        shape="square"
        {alt}
        {color}
        {initials}
      />
    </div>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100vw;
    height: 100vh;

    // TODO(DESK-1160): `:global()` style rules are smelly should be removed. This could be achieved
    // by refactoring the `ProfilePicture` component and making it responsive, so that we don't need
    // lots of style tricks here.
    .profile-picture {
      /* 
       * Styles of a profile picture which doesn't contain an image.
       */

      &:global(:not(:has(> div > img))) {
        --c-profile-picture-size: #{rem(240px)};

        @extend %elevation-160;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--c-modal-dialog-background-color);
        border-radius: rem(8px);
        overflow: hidden;
        max-width: 100%;
        max-height: 100%;
      }

      /* 
       * Styles of a profile picture which contains an image.
       */

      &:global(:has(> div > img)) {
        // Disable `pointer-events` here, so that clicks are registered on the modal overlay behind
        // it.
        pointer-events: none;
      }

      &:global(:has(> div > img) > div) {
        display: grid;
        position: relative;
        place-items: center;
        width: 100vw;
        height: 100vh;
        padding: rem(41px);
        background-color: transparent;

        // Disable `pointer-events` here as well, for the same reason as above.
        pointer-events: none;
      }

      &:global(:has(> div > img) > div > img) {
        @extend %elevation-160;
        grid-area: 1 / 1;
        border-radius: rem(8px);
        display: block;
        object-fit: contain;
        min-width: rem(16px);
        min-height: rem(16px);
        width: auto;
        height: auto;
        max-width: 100%;
        max-height: 100%;

        // Re-enable pointer-events only on the `img`, so that clicking it won't close the modal.
        pointer-events: auto;
      }
    }
  }
</style>
