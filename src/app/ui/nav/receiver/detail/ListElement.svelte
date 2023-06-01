<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';

  /**
   * The label.
   */
  export let label: string;

  /**
   * Temporary wip flag for unfinished features
   */
  export let wip = false;

  export let isInfoModalVisible: boolean | undefined = undefined;

  $: hasInfoModal = isInfoModalVisible !== undefined;
</script>

<template>
  <div class="list-element" class:wip>
    <div class="label">{label}</div>
    <div class="value"><slot /></div>
    {#if hasInfoModal}
      <div class="icon" on:click={() => (isInfoModalVisible = true)}>
        <MdIcon theme="Outlined">info</MdIcon>
      </div>
    {/if}
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .list-element {
    display: grid;
    grid-template:
      'label icon' auto
      'value icon' auto
      / 1fr min-content;
    height: rem(56px);
    padding: rem(10px) rem(16px);

    .label {
      @extend %font-small-400;
      color: var(--t-text-e2-color);
      grid-area: label;
    }

    .value {
      grid-area: value;
      margin-top: rem(-1px);
      user-select: all;
    }

    .icon {
      grid-area: icon;
      display: grid;
      place-items: center;
      user-select: none;
      color: var(--ic-list-element-color);
      cursor: pointer;
      padding: 0 rem(5px);
      margin: 0 rem(-5px);
    }
  }
</style>
