<!--
  @component
  Renders a section in a `KeyValueList`, which groups together multiple `Item`s.
-->
<script lang="ts">
  import Label from '~/app/ui/components/atoms/label/Label.svelte';
  import type {SectionProps} from '~/app/ui/components/molecules/key-value-list/internal/section/props';

  type $$Props = SectionProps;

  export let title: $$Props['title'] = undefined;
</script>

<div class="section">
  {#if title !== undefined}
    <div class="title">
      <Label text={title} />
    </div>
  {/if}

  <slot />
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
      @extend %font-small-400;
      padding: rem(10px) rem(16px) rem(4px);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 2.4px;
    }
  }
</style>
