<!--
  @component
  Renders file details as part of a message.
-->
<script lang="ts">
  import Label from '~/app/ui/components/atoms/label/Label.svelte';
  import type {FileInfoProps} from '~/app/ui/components/molecules/message/internal/file-info/props';
  import {getSanitizedFileNameDetails} from '~/common/utils/file';
  import {byteSizeToHumanReadable} from '~/common/utils/number';

  type $$Props = FileInfoProps;

  export let mediaType: $$Props['mediaType'];
  export let name: $$Props['name'];
  export let sizeInBytes: $$Props['sizeInBytes'];

  $: details = getSanitizedFileNameDetails({
    name: name.raw ?? '',
    type: mediaType,
  });
</script>

<button class="file-info" on:click>
  <span class="icon">
    {details.displayType === undefined ? '?' : details.displayType.substring(0, 4)}
  </span>
  <span class="name" class:default={details.name === ''}
    >{details.name === '' ? name.default : details.name}</span
  >
  <span class="footer">
    <span class="size">
      <Label text={byteSizeToHumanReadable(sizeInBytes)} wrap={false} />
    </span>
    {#if $$slots.status}
      <span class="status">
        <slot name="status" />
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
      grid-area: footer;
      @extend %font-small-400;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-width: 100%;
      gap: rem(8px);
      color: var(--mc-message-file-size-color);
    }
  }
</style>
