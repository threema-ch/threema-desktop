<script lang="ts">
  import Icon from '~/app/ui/svelte-components/blocks/Icon/Icon.svelte';

  /**
   * Let the icon appear disabled.
   */
  export let disabled = false;

  /**
   * Apply the desired icon theme.
   */
  export let theme: 'Filled' | 'Outlined';

  /**
   * Optional title of the icon
   */
  export let title = '';
</script>

<template>
  <Icon {disabled} {title} font={`Material Icons ${theme}`}>
    <slot>info</slot>
  </Icon>
</template>
