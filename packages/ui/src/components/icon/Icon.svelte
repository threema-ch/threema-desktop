<!--
  @component An icon glyph, rendered with one of the icon fonts.

  The size of an icon is its font size, which by default matches the line height of the surrounding
  text, so that an icon lines up with text it is placed next to. Override it with the `class` prop
  where a fixed size is needed.

  Icons are decorative by default. Pass a `label` if the icon is the only content of a control, and
  the control has no accessible name of its own.

  @example
  ```svelte
  <Icon glyph="chat_bubble" />

  <Icon
    class="text-2xl"
    font={{family: 'material', style: 'filled'}}
    glyph="mic_off"
    label="Microphone is muted"
  />
  ```
-->

<script lang="ts" module>
  import type {HTMLAttributes} from 'svelte/elements';
  import {type VariantProps, cn, tv} from 'tailwind-variants';

  import type {WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';

  export const iconVariants = tv({
    base: 'inline-block shrink-0 text-[1lh] font-normal not-italic antialiased',
    variants: {
      family: {
        material: '',
        threema: '',
      },
      style: {
        filled: '',
        outlined: '',
      },
    },
    compoundVariants: [
      {
        family: 'material',
        style: 'outlined',
        class: 'font-icon-material-outlined',
      },
      {
        family: 'material',
        style: 'filled',
        // Outlined font is used but configured to be filled using `font-variation-settings`.
        class: "font-icon-material-outlined [font-variation-settings:'FILL'_1]",
      },
      {
        family: 'threema',
        style: 'outlined',
        class: 'font-icon-threema-outlined',
      },
      {
        family: 'threema',
        style: 'filled',
        class: 'font-icon-threema-filled',
      },
    ],
    defaultVariants: {
      family: 'material',
      style: 'outlined',
    },
  });

  type IconVariants = VariantProps<typeof iconVariants>;

  type BaseProps = WithElementRef<
    {
      /**
       * Icon font to render the `glyph` with.
       */
      readonly font?: {
        /**
         * Family of the icon font. Defaults to `'material'`.
         */
        readonly family?: IconVariants['family'];
        /**
         * Style of the icon font. Defaults to `'outlined'`.
         */
        readonly style?: IconVariants['style'];
      };
      /**
       * The glyph to render, e.g. `'chat_bubble'`.
       */
      readonly glyph: string;
      /**
       * Accessible name of the icon. If provided, the icon is exposed to assistive technology as an
       * image with this name. If not provided, the icon is treated as decorative and hidden, which
       * is the correct choice whenever the surrounding element already has an accessible name.
       */
      readonly label?: string;
    },
    HTMLSpanElement
  >;

  export type IconProps = BaseProps &
    WithoutChildren<Omit<HTMLAttributes<HTMLSpanElement>, keyof BaseProps>>;
</script>

<script lang="ts">
  let {
    class: className,
    font = {},
    glyph,
    label,
    ref = $bindable(null),
    ...restProps
  }: IconProps = $props();
</script>

<!--
  Note: The glyph must not be surrounded by whitespace, because the icon fonts resolve it as a
  ligature of its exact text content.

  Note: `leading-none` is deliberately applied *after* the external `className`, unlike every other
  class of this component. This is required because `font-size` conflicts with `leading` in
  `tailwind-merge`, so `"leading-none"` would be overridden if the consumer passes a `"text-<size>"`
  class.
-->
<span
  bind:this={ref}
  aria-hidden={label === undefined ? 'true' : undefined}
  aria-label={label}
  class={cn(iconVariants(font), className, 'leading-none')}
  role={label === undefined ? undefined : 'img'}
  {...restProps}>{glyph}</span
>
