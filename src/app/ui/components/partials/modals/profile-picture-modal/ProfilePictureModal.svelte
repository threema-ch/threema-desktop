<!--
  @component
  Renders a modal to view a profile picture in full size.
-->
<script lang="ts">
  import {onDestroy, onMount} from 'svelte';

  import ProfilePicture from '#3sc/components/threema/ProfilePicture/ProfilePicture.svelte';
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
    padding: rem(41px);

    .profile-picture {
      --c-profile-picture-size: #{rem(480px)};

      background-color: var(--c-modal-dialog-background-color);
    }
  }
</style>
