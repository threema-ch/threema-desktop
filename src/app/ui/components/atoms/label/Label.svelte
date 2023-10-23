<!--
  @component
  Renders short, unformatted pieces of text.
-->
<script lang="ts">
  import type {LabelProps} from '~/app/ui/components/atoms/label/props';

  type $$Props = LabelProps;

  export let text: $$Props['text'];
  export let wrap: NonNullable<$$Props['wrap']> = true;
  export let selectable: NonNullable<$$Props['selectable']> = false;
</script>

<span class="label" class:wrap class:selectable>
  {text}
</span>

<style lang="scss">
  @use 'component' as *;

  .label {
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
