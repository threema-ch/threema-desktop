<script lang="ts">
  import {identity} from 'svelte/internal';

  export let label: string | undefined = undefined;
  export let value: string;
  export let options: readonly string[];
  export let optionToLabel: (option: string) => string = identity;
</script>

<template>
  <div class="select" data-label={label !== undefined}>
    <div class="wrapper">
      {#if label !== undefined}
        <div class="label">{label}</div>
      {/if}
      <div class="value">
        <select bind:value>
          {#each options as option}
            <option value={option}>
              {optionToLabel(option)}
            </option>
          {/each}
        </select>
      </div>
    </div>
    <div class="icon" />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  .select {
    display: grid;
    height: rem(56px);
    grid-template:
      'wrapper icon'
      / 1fr min-content;
    column-gap: rem(8px);
    padding: rem(10px) rem(16px) rem(10px) rem(16px);

    .wrapper {
      grid-area: wrapper;

      .label {
        @extend %font-small-400;
        color: var(--t-text-e2-color);
      }
    }

    .value {
      select {
        background-color: transparent;
        color: var(--t-text-e1-color);
        text-transform: capitalize;
      }
    }

    .icon {
      grid-area: icon;
      display: grid;
      place-items: center;
    }
  }
</style>
