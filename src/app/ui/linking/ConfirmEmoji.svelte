<script lang="ts">
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import {i18n} from '~/app/ui/i18n';
  import {unwrap} from '~/common/utils/assert';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  import {type LinkingParams, type LinkingState} from '.';

  export let params: LinkingParams;
  export let linkingState: LinkingState;
  unusedProp(params, linkingState);

  // Get emoji indices based on RPH
  const rendzevousPathHash = unwrap(
    linkingState.rendzevousPathHash,
    'Initialized ConfirmEmoji component without rendezvousPathHash',
  );
  const emoji = [
    rendzevousPathHash[0] % 128,
    rendzevousPathHash[1] % 128,
    rendzevousPathHash[2] % 128,
  ] as const;
</script>

<template>
  <ModalDialog visible={true} closableWithEscape={false}>
    <div class="body" slot="body">
      <div>
        {$i18n.t('dialog--linking.prose--confirm-emoji', 'Confirm emojis on your mobile device')}
      </div>
      <div class="emojis">
        <span class="emoji">Emoji {emoji[0]}</span>
        <span class="emoji">Emoji {emoji[1]}</span>
        <span class="emoji">Emoji {emoji[2]}</span>
      </div>
    </div>
  </ModalDialog>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    width: rem(480px);
    padding: rem(16px) rem(16px) rem(40px) rem(16px);

    .emoji {
      border: 1px solid green;
    }
  }
</style>
