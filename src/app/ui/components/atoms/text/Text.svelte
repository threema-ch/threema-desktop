<!--
  @component
  Renders short, unformatted pieces of text.
-->
<script lang="ts">
  import type {TextProps} from '~/app/ui/components/atoms/text/props';

  type $$Props = TextProps;

  export let color: NonNullable<$$Props['color']> = 'inherit';
  export let decoration: NonNullable<$$Props['decoration']> = 'inherit';
  export let ellipsis: NonNullable<$$Props['ellipsis']> = false;
  export let family: NonNullable<$$Props['family']> = 'inherit';
  export let selectable: NonNullable<$$Props['selectable']> = false;
  export let size: NonNullable<$$Props['size']> = 'inherit';
  export let text: $$Props['text'];
  export let wrap: NonNullable<$$Props['wrap']> = true;
</script>

<span
  class={`text c-${color} d-${decoration} f-${family} s-${size}`}
  class:ellipsis
  class:selectable
  class:wrap
>
  {text}
</span>

<style lang="scss">
  @use 'component' as *;

  .text {
    overflow-wrap: normal;
    white-space: nowrap;

    // Color variants
    &.c-mono-high {
      color: var(--t-text-e1-color);
    }

    &.c-mono-low {
      color: var(--t-text-e2-color);
    }

    &.c-mono-disabled {
      color: var(--t-text-e3-color);
    }

    &.d-strikethrough {
      text-decoration: line-through;
    }

    &.d-underline {
      text-decoration: underline;
    }

    // Font family variants
    &.f-primary {
      font-weight: 700;
    }

    &.f-secondary {
      font-weight: 400;
    }

    // Sizes
    &.s-h1 {
      font-size: rem(48px);
      line-height: rem(48px);
    }

    &.s-h2 {
      font-size: rem(40px);
      line-height: rem(40px);
    }

    &.s-h3 {
      font-size: rem(32px);
      line-height: rem(32px);
    }

    &.s-h4 {
      font-size: rem(24px);
      line-height: rem(24px);
    }

    &.s-h5 {
      font-size: rem(20px);
      line-height: rem(20px);
    }

    &.s-h6 {
      font-size: rem(18px);
      line-height: rem(18px);
    }

    &.s-body-large {
      font-size: rem(16px);
      line-height: rem(24px);
    }

    &.s-body {
      font-size: rem(14px);
      line-height: rem(20px);
    }

    &.s-body-small {
      font-size: rem(12px);
      line-height: rem(18px);
    }

    &.s-meta {
      font-size: rem(10px);
      line-height: rem(16px);
    }

    // Options
    &.ellipsis {
      max-width: 100%;
      display: inline-block;
      overflow-x: hidden;
      text-overflow: ellipsis;
    }

    &.selectable {
      user-select: text;
    }

    &.wrap {
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
  }
</style>
