<template>
  <div>
    <slot />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    display: contents;
    --c-global-overlay-background: var(--cc-modal-dialog-background-color);
  }
</style>
