<script lang="ts">
  import IconButton from '#3sc/components/blocks/Button/IconButton.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import Title from '#3sc/components/blocks/ModalDialog/Header/Title.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  import {type LinkingParams, type LinkingState} from '.';

  export let params: LinkingParams;
  export let linkingState: LinkingState;
  unusedProp(params, linkingState);
</script>

<template>
  <ModalDialog visible={true} closableWithEscape={false}>
    <Title slot="header" title={$i18n.t('dialog--linking.label--error-title', 'Linking Error')} />
    <div class="body" slot="body">
      <div class="description">
        <p>
          {$i18n.t(
            'dialog--linking.error--generic-error',
            'An error occurred during linking. Please try again.',
          )}
        </p>
      </div>
      <IconButton flavor="filled" on:click={() => window.location.reload()}>
        <MdIcon theme="Filled">replay</MdIcon>
        Retry
      </IconButton>
    </div>
  </ModalDialog>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    width: rem(480px);
    padding: rem(16px) rem(16px) rem(40px) rem(16px);
  }
</style>
