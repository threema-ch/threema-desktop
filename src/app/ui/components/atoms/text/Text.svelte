<!--
  @component
  Renders short, unformatted pieces of text.
-->
<script lang="ts">
  import type {TextProps} from '~/app/ui/components/atoms/text/props';

  type $$Props = TextProps;

  export let text: $$Props['text'];
  export let wrap: NonNullable<$$Props['wrap']> = true;
  export let selectable: NonNullable<$$Props['selectable']> = false;
</script>

<span class="text" class:wrap class:selectable>
  {text}
</span>

<style lang="scss">
  @use 'component' as *;

  .text {
    overflow-wrap: normal;
    white-space: nowrap;

    &.wrap {
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    &.selectable {
      user-select: text;
    }
  }
</style>
