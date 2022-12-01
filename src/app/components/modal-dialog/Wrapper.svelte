<template>
  <div>
    <slot />
  </div>
</template>

<style lang="scss">
  @use 'component' as *;

  div {
    --c-global-overlay-background: var(--cc-modal-dialog-background-color);
  }
</style>
