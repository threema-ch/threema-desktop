<!--
  @component
  Renders a section in a `KeyValueList`, which groups together multiple `Item`s.
-->
<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {SectionProps} from '~/app/ui/components/molecules/key-value-list/internal/section/props';

  type $$Props = SectionProps;

  export let options: NonNullable<$$Props['options']> = {};
  export let title: $$Props['title'] = undefined;

  $: isItemInsetEnabled = title !== undefined && options.disableItemInset !== true;
</script>

<div class="section">
  {#if title !== undefined && title !== ''}
    <div class="title">
      <Text text={title} color="mono-low" family="secondary" size="body" />
    </div>
  {/if}

  <div class="content" class:inset={isItemInsetEnabled}>
    <slot />
  </div>
</div>

<style lang="scss">
  @use 'component' as *;

  .section {
    :global(.section) ~ & {
      border-top: rem(1px) solid var(--ic-divider-background-color);
      margin-top: rem(8px);
      padding-top: rem(8px);
    }

    .title {
      padding: rem(14px) rem(16px);
    }

    .content {
      &.inset {
        :global(.item) {
          padding-left: rem(40px);
        }
      }
    }
  }
</style>
