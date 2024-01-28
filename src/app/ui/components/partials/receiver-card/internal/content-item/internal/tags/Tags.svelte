<!--
  @component 
  Renders pills to display the current status of a receiver.
-->
<script lang="ts">
  import type {TagsProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/tags/props';
  import {i18n} from '~/app/ui/i18n';

  type $$Props = TagsProps;

  export let isArchived: NonNullable<$$Props['isArchived']> = false;
  export let isCreator: NonNullable<$$Props['isCreator']> = false;
  export let isInactive: NonNullable<$$Props['isInactive']> = false;
  export let isInvalid: NonNullable<$$Props['isInvalid']> = false;
</script>

<span class="container">
  {#if isArchived}
    <span class="tag">
      {$i18n.t('contacts.label--status-archived')}
    </span>
  {/if}

  {#if isCreator}
    <span class="tag">
      {$i18n.t('contacts.label--status-creator')}
    </span>
  {/if}

  {#if isInactive}
    <span class="tag">
      {$i18n.t('contacts.label--status-inactive')}
    </span>
  {/if}

  {#if isInvalid}
    <span class="tag">
      {$i18n.t('contacts.label--status-invalid')}
    </span>
  {/if}
</span>

<style lang="scss">
  @use 'component' as *;

  $-temp-vars: (--cc-t-background-color);

  .container {
    display: flex;
    align-items: center;
    justify-content: start;
    gap: rem(4px);

    .tag {
      @extend %font-meta-400;
      padding: rem(2px) rem(4px);
      border-radius: rem(4px);
      line-height: rem(12px);
      color: var(--cc-contact-status-tag-text-color);
      background-color: var(--cc-contact-status-tag-background-color);
    }
  }
</style>
