<!--
  @component 
  Renders icons to display the current preferences of a conversation.
-->
<script lang="ts">
  import type {CharmsProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/charms/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import ThreemaIcon from '~/app/ui/svelte-components/blocks/Icon/ThreemaIcon.svelte';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = CharmsProps;

  export let isBlocked: NonNullable<$$Props['isBlocked']> = false;
  export let isPinned: NonNullable<$$Props['isPinned']> = false;
  export let isPrivate: NonNullable<$$Props['isPrivate']> = false;
  export let notificationPolicy: NonNullable<$$Props['notificationPolicy']> = 'default';
</script>

<span class="container">
  {#if isBlocked}
    <span class="charm blocked">
      <MdIcon title={$i18n.t('contacts.label--blocked', 'Blocked')} theme="Filled">block</MdIcon>
    </span>
  {/if}

  {#if notificationPolicy !== 'default'}
    <span class="charm notifications">
      {#if notificationPolicy === 'muted'}
        <MdIcon theme="Filled">notifications_off</MdIcon>
      {:else if notificationPolicy === 'mentioned'}
        <MdIcon theme="Filled">alternate_email</MdIcon>
      {:else if notificationPolicy === 'never'}
        <MdIcon theme="Filled">remove_circle</MdIcon>
      {:else}
        {unreachable(notificationPolicy)}
      {/if}
    </span>
  {/if}

  {#if isPrivate}
    <span class="charm private">
      <ThreemaIcon theme="Filled">incognito</ThreemaIcon>
    </span>
  {/if}

  {#if isPinned}
    <span class="charm pinned">
      <MdIcon theme="Filled">push_pin</MdIcon>
    </span>
  {/if}
</span>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--cc-t-background-color);

  .container {
    padding-left: rem(5px);
    display: flex;
    flex-direction: row-reverse;

    .charm {
      display: flex;
      align-items: center;
      justify-content: center;

      width: rem(20px);
      height: rem(20px);
      margin-left: rem(-5px);
      color: var(--cc-conversation-preview-properties-icon-color);
      background-color: var(--cc-conversation-preview-properties-background-color);
      border-radius: 50%;
      font-size: rem(12px);

      &.blocked {
        order: 4;

        color: red;
        font-weight: 900;
      }

      &.notifications {
        order: 3;
      }

      &.private {
        order: 2;
      }

      &.pinned {
        order: 1;

        color: var(--cc-conversation-preview-properties-icon-pin-color);
      }
    }
  }
</style>
