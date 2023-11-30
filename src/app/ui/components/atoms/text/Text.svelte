<!--
  @component
  Renders short, unformatted pieces of text.
-->
<script lang="ts">
  import type {TextProps} from '~/app/ui/components/atoms/text/props';

  type $$Props = TextProps;

  export let color: NonNullable<$$Props['color']> = 'mono';
  export let emphasis: NonNullable<$$Props['emphasis']> = 'high';
  export let family: NonNullable<$$Props['family']> = 'secondary';
  export let selectable: NonNullable<$$Props['selectable']> = false;
  export let size: NonNullable<$$Props['size']> = 'body';
  export let text: $$Props['text'];
  export let wrap: NonNullable<$$Props['wrap']> = true;

  // TODO(DESK-1259) finish css tasks.
</script>

<span class={`text ${color} ${emphasis} ${family} ${size}`} class:selectable class:wrap>
  {text}
</span>

<style lang="scss">
  @use 'component' as *;

  .text {
    overflow-wrap: normal;
    white-space: nowrap;

    // Color variants
    &.primary {
      // Emphasis variants
      &.high {
        // TODO
        // color: var(--t-primary-text-e1-color);
      }

      &.low {
        // TODO
        // color: var(--t-primary-text-e2-color);
      }

      &.disabled {
        // TODO
        // color: var(--t-primary-text-e3-color);
      }
    }

    &.mono {
      // Emphasis variants
      &.high {
        color: var(--t-text-e1-color);
      }

      &.low {
        color: var(--t-text-e2-color);
      }

      &.disabled {
        color: var(--t-text-e3-color);
      }
    }

    // Font family variants
    &.primary {
      font-weight: 700;
    }

    &.secondary {
      font-weight: 400;
    }

    // Sizes
    &.h1 {
      font-size: rem(48px);
      line-height: rem(48px);
    }

    &.h2 {
      font-size: rem(40px);
      line-height: rem(40px);
    }

    &.h3 {
      font-size: rem(32px);
      line-height: rem(32px);
    }

    &.h4 {
      font-size: rem(24px);
      line-height: rem(24px);
    }

    &.h5 {
      font-size: rem(20px);
      line-height: rem(20px);
    }

    &.h6 {
      font-size: rem(18px);
      line-height: rem(18px);
    }

    &.body-large {
      font-size: rem(16px);
      line-height: rem(24px);
    }

    &.body {
      font-size: rem(14px);
      line-height: rem(20px);
    }

    &.body-small {
      font-size: rem(12px);
      line-height: rem(18px);
    }

    &.meta {
      font-size: rem(10px);
      line-height: rem(16px);
    }

    // Options
    &.selectable {
      user-select: text;
    }

    &.wrap {
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
  }
</style>
