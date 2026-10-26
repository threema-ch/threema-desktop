<!--
  @component Renders file details as part of a message.
-->
<script lang="ts">
  import {byteSizeToHumanReadable} from '@threema/ts-utils/conversion/byte-size-to-human-readable';

  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {FileInfoProps} from '~/app/ui/components/molecules/message/internal/file-info/props';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {getSanitizedFileNameDetails} from '~/common/utils/file';

  const {
    disabled = false,
    mediaType,
    name,
    onclick,
    sizeInBytes,
    snippetFooterAside,
    syncFailureReason,
  }: FileInfoProps = $props();

  const details = $derived(
    getSanitizedFileNameDetails({
      name: name.raw ?? '',
      type: mediaType,
    }),
  );
</script>

<button class="file-info" {disabled} {onclick}>
  <span class="icon">
    {details.displayType === undefined ? '?' : details.displayType.substring(0, 4)}
  </span>
  <span class="name" class:default={details.name === ''}>
    {details.name === '' ? name.default : details.name}
  </span>
  <span class="footer">
    <span class="size">
      {#if syncFailureReason !== undefined}
        <span class="warning-icon">
          <MdIcon title={syncFailureReason} theme="Filled">warning</MdIcon>
        </span>
      {/if}
      <Text text={byteSizeToHumanReadable(sizeInBytes)} wrap={false} />
    </span>
    {#if snippetFooterAside !== undefined}
      <span class="status">
        {@render snippetFooterAside?.()}
      </span>
    {/if}
  </span>
</button>

<style lang="scss">
  @use 'component' as *;

  .file-info {
    @extend %neutral-input;
    display: grid;
    grid-template:
      'icon name' auto
      'icon footer' auto
      / var(--mc-message-file-icon-width) auto;
    column-gap: var(--mc-message-file-info-column-gap);
    row-gap: var(--mc-message-file-info-row-gap);
    justify-items: start;
    cursor: pointer;
    text-align: start;
    word-break: break-all;

    &:disabled {
      cursor: unset;
    }

    .icon {
      grid-area: icon;
      width: 100%;
      height: 100%;
      font-size: var(--mc-message-file-icon-font-size);

      display: grid;
      place-items: center;
      text-transform: uppercase;
      background-image: var(--cc-media-message-file-type-background-image);
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
      color: var(--cc-media-message-file-type-text-color);
      width: 100%;
      height: 100%;
      user-select: none;
    }

    .name {
      grid-area: name;
      padding: rem(2px) rem(4px);
      margin: rem(-2px) rem(-4px);
      border-radius: rem(2px);

      &.default {
        font-style: italic;
      }
    }

    .footer {
      @extend %font-small-400;

      grid-area: footer;

      display: flex;
      align-items: center;
      justify-content: space-between;
      min-width: 100%;
      gap: rem(8px);
      color: var(--mc-message-file-size-color);

      .size {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--mc-message-indicator-column-gap);

        .warning-icon {
          display: flex;
          color: var(--mc-message-file-error-color);
        }
      }

      .status {
        @include def-var(--c-icon-font-size, var(--mc-message-indicator-icon-size));
        @extend %font-small-400;

        justify-self: end;
        display: flex;
        align-items: center;
        gap: var(--mc-message-indicator-column-gap);
        color: var(--mc-message-indicator-label);
      }
    }
  }
</style>
