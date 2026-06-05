<script lang="ts">
  import {onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import FileInput from '~/app/ui/components/atoms/file-input/FileInput.svelte';
  import DropZoneProvider from '~/app/ui/components/hocs/drop-zone-provider/DropZoneProvider.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import EditPictureCanvas from '~/app/ui/components/partials/modals/edit-picture-modal/internal/edit-picture-canvas/EditPictureCanvas.svelte';
  import type {EditPictureModalProps} from '~/app/ui/components/partials/modals/edit-picture-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import {toast} from '~/app/ui/snackbar';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {FileResult} from '~/app/ui/svelte-components/utils/filelist';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import type {ProfilePictureBlobStoreValue} from '~/common/dom/ui/profile-picture';
  import type {Dimensions} from '~/common/types';
  import {unreachable, unwrap} from '~/common/utils/assert';
  import {isSupportedImageType} from '~/common/utils/image';
  import {WritableStore} from '~/common/utils/store';

  const {uiLogging} = globals.unwrap();
  const log = uiLogging.logger('ui.component.edit-picture-modal');

  const {blob, color, onclose, onsubmit, placeholder, title}: EditPictureModalProps = $props();

  const profilePictureStore = $state<WritableStore<ProfilePictureBlobStoreValue>>(
    new WritableStore<ProfilePictureBlobStoreValue>(undefined),
  );

  let modalComponent = $state<SvelteNullableBinding<Modal>>(null);
  let fileInput = $state<SvelteNullableBinding<HTMLInputElement>>(null);
  let editPictureCanvas = $state<SvelteNullableBinding<EditPictureCanvas>>(null);
  let isDirty = $state<boolean>(false);

  async function handleFileResult(fileResult: FileResult): Promise<void> {
    switch (fileResult.status) {
      case 'ok':
        break;
      case 'partial':
      case 'inaccessible':
      case 'empty':
        toast.addSimpleFailure(
          $i18n.t(
            'dialog--edit-profile-picture.error--loading-file-failed',
            'Failed to load the provided file',
          ),
        );
        return;
      default:
        unreachable(fileResult);
    }
    if (fileResult.files.length === 0) {
      return;
    }
    if (fileResult.files.length > 1) {
      log.debug(
        'Multiple profile picture candidates were passed to the modal. Taking the first one',
      );
    }
    const file = unwrap(fileResult.files[0]);

    // Check if file is a supported image
    if (!isSupportedImageType(file.type)) {
      toast.addSimpleFailure(
        $i18n.t(
          'dialog--edit-profile-picture.error--file-wrong-format',
          'Provided file has the wrong format',
        ),
      );
      return;
    }

    await setProfilePictureStore(file);
    isDirty = true;
  }

  async function setProfilePictureStore(
    img: Blob | undefined,
    dimensions?: Dimensions,
  ): Promise<void> {
    if (img === undefined) {
      profilePictureStore.set(undefined);
      return;
    }

    if (dimensions !== undefined) {
      profilePictureStore.set({
        blob: img,
        dimensions,
      });
      return;
    }

    const bitmap = await createImageBitmap(img);
    profilePictureStore.set({
      blob: img,
      dimensions: {height: bitmap.height, width: bitmap.width},
    });
    bitmap.close();
  }

  async function setProfilePicture(): Promise<void> {
    try {
      const img = await editPictureCanvas?.getBlob();
      await onsubmit(img);
    } catch (error) {
      log.warn('Failed to set new profile picture: ', error);
      toast.addSimpleFailure(
        $i18n.t(
          'dialog--edit-profile-picture.error--setting-blob-failed',
          'Failed to set the new profile picture.',
        ),
      );
    } finally {
      modalComponent?.close();
    }
  }

  const isSet = $derived($profilePictureStore?.blob !== undefined);

  onMount(async () => {
    await setProfilePictureStore(blob);
  });
</script>

<Modal
  bind:this={modalComponent}
  wrapper={{
    type: 'card',
    actions: [
      {
        iconName: 'close',
        onclick: onclose,
      },
    ],
    buttons: [
      {
        label: $i18n.t('dialog--edit-profile-picture.action--delete', 'Remove Picture'),
        onclick: async () => {
          await setProfilePictureStore(undefined);
          isDirty = true;
        },
        type: 'naked',
        disabled: !isSet,
      },
      {
        label: $i18n.t('dialog--edit-profile-picture.action--select', 'Select Picture'),
        onclick: () => {
          fileInput?.click();
        },
        type: 'naked',
        disabled: false,
      },
      {
        label: $i18n.t('dialog--edit-profile-picture.action--save', 'Save Changes'),
        onclick: 'submit',
        type: 'filled',
        disabled: !isDirty,
      },
    ],
    title,
    maxWidth: 800,
  }}
  {onclose}
  onsubmit={setProfilePicture}
  options={{
    allowClosingWithEsc: true,
    allowSubmittingWithEnter: false,
  }}
>
  <div class="content" class:padded={$profilePictureStore?.blob === undefined}>
    <DropZoneProvider
      overlay={{
        message: $i18n.t('dialog--edit-profile-picture.hint--drop-file', 'Drop file here'),
      }}
      ondropfiles={handleFileResult}
    >
      {#if $profilePictureStore?.blob === undefined}
        <div class="avatar" data-color={color}>
          {#if placeholder.type === 'initials'}
            <span class="initials">{placeholder.initials}</span>
          {:else if placeholder.type === 'icon'}
            <span class="placeholder">
              <MdIcon theme="Outlined">{placeholder.name}</MdIcon>
            </span>
          {:else}
            {unreachable(placeholder)}
          {/if}
        </div>
      {:else}
        <EditPictureCanvas
          {profilePictureStore}
          bind:this={editPictureCanvas}
          ondirty={() => {
            isDirty = true;
          }}
        ></EditPictureCanvas>
      {/if}
    </DropZoneProvider>

    <FileInput accept="image/*" ondropfiles={handleFileResult} bind:fileInput />
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    display: flex;
    align-items: center;
    justify-content: stretch;

    height: 100%;
    overflow: hidden;

    & :global(> .dropzone) {
      display: flex;
      align-items: center;
      justify-content: center;

      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .avatar {
      display: block;
      position: relative;
      overflow: hidden;
      border-radius: 50%;
      width: 100%;
      max-width: rem(380px);
      aspect-ratio: 1;

      @each $color in map-get-req($config, profile-picture-colors) {
        &[data-color='#{$color}'] {
          color: var(--c-profile-picture-initials-#{$color}, default);
          background-color: var(--c-profile-picture-background-#{$color}, default);
        }
      }

      .initials,
      .placeholder {
        font-size: rem(24px);
        display: flex;
        place-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        text-transform: uppercase;
      }
    }

    &.padded {
      padding: 0 rem(16px) rem(16px);
    }
  }
</style>
