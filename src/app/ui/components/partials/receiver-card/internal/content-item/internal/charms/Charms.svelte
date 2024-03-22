<!--
  @component 
  Renders icons to display the current preferences of a conversation.
-->
<script lang="ts">
  import RadialExclusionMaskProvider from '~/app/ui/components/hocs/radial-exclusion-mask-provider/RadialExclusionMaskProvider.svelte';
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

  const DEFAULT_CUTOUT = {
    diameter: 26,
    position: {
      x: -50,
      y: 50,
    },
  };
</script>

<span class="container">
  {#if isBlocked}
    <span class="charm blocked">
      <MdIcon title={$i18n.t('contacts.label--blocked', 'Blocked')} theme="Filled">block</MdIcon>
    </span>
  {/if}

  {#if notificationPolicy !== 'default'}
    {@const hasNeighborLeft = isBlocked}

    <RadialExclusionMaskProvider cutouts={hasNeighborLeft ? [DEFAULT_CUTOUT] : []}>
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
    </RadialExclusionMaskProvider>
  {/if}

  {#if isPrivate}
    {@const hasNeighborLeft = isBlocked || notificationPolicy !== 'default'}

    <RadialExclusionMaskProvider cutouts={hasNeighborLeft ? [DEFAULT_CUTOUT] : []}>
      <span class="charm private">
        <ThreemaIcon theme="Filled">incognito</ThreemaIcon>
      </span>
    </RadialExclusionMaskProvider>
  {/if}

  {#if isPinned}
    {@const hasNeighborLeft = isBlocked || notificationPolicy !== 'default' || isPrivate}

    <RadialExclusionMaskProvider cutouts={hasNeighborLeft ? [DEFAULT_CUTOUT] : []}>
      <span class="charm pinned">
        <MdIcon theme="Filled">push_pin</MdIcon>
      </span>
    </RadialExclusionMaskProvider>
  {/if}
</span>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--cc-t-background-color);

  .container {
    display: flex;
    flex-direction: row;

    .charm {
      display: flex;
      align-items: center;
      justify-content: center;

      width: rem(20px);
      height: rem(20px);
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

    & :global(> *:not(:first-child)) {
      margin-left: -2px;
    }
  }
</style>
