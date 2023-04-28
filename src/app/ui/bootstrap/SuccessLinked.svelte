<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import ModalDialog from '#3sc/components/blocks/ModalDialog/ModalDialog.svelte';
  import PartyPopper from '~/app/res/icon/emoji-party-popper.svg?raw';
  import {i18n} from '~/app/ui/i18n';
  import MarkupText from '~/app/ui/MarkupText.svelte';

  const dispatchEvent = createEventDispatcher();
</script>

<template>
  <ModalDialog visible={true}>
    <div class="body" slot="body">
      <div class="party">
        {@html PartyPopper}
      </div>
      <div class="title">
        {$i18n.t('dialog--success-link-device.label--title', 'Device Linked Successfully')}
      </div>
      <div class="description">
        <!-- TODO(DESK-1012): Verify if this works -->
        <MarkupText
          markup={$i18n.t(
            'dialog--success-link-device.markup--description',
            'You can now use Threema on this computer <1/>(even when your iOS device happens to be turned off).',
          )}
        >
          <br slot="1" />
        </MarkupText>
      </div>
      <div class="hint">
        <MarkupText
          markup={$i18n.t(
            'dialog--success-link-device.markup--tech-preview',
            'Please remember that this is a tech preview. Known issues are listed <1>here</1>.',
          )}
        >
          <a
            slot="1"
            href="https://threema.ch/faq/md_limit"
            target="_blank"
            rel="noreferrer noopener"
            let:text>{text}</a
          >
        </MarkupText>
      </div>
      <div class="button">
        <Button flavor="filled" on:click={() => dispatchEvent('close')}
          >{$i18n.t('dialog--success-link-device.action--confirm', 'Close')}</Button
        >
      </div>
    </div>
  </ModalDialog>
</template>

<style lang="scss">
  @use 'component' as *;

  .body {
    width: rem(480px);
    padding: rem(48px) rem(16px);

    display: grid;
    grid-template:
      'party'
      'title'
      'description'
      'hint'
      'button';
    justify-items: center;

    .party {
      height: rem(74px);
      line-height: rem(74px);
      font-size: rem(56px);
    }

    .title {
      @extend %font-h5-400;
      padding: rem(16px) 0;
    }

    .description {
      @extend %font-large-400;
      text-align: center;
    }

    .hint {
      padding: rem(48px) 0 rem(20px) 0;
      color: var(--t-text-e2-color);

      a {
        color: inherit;
        text-decoration: underline;
      }
    }
  }
</style>
