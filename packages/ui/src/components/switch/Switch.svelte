<script lang="ts" module>
  import type {HTMLInputAttributes} from 'svelte/elements';
  import {type VariantProps, cn, tv} from 'tailwind-variants';

  import type {WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';

  export const switchVariants = tv({
    slots: {
      root: 'group relative h-4.5 w-7.25 transition-colors duration-150',
      track: 'absolute top-1/2 h-3 w-7.25 -translate-y-1/2 rounded-full',
      thumb:
        "absolute left-0 size-4.5 translate-x-0 cursor-pointer rounded-full transition-transform duration-150 before:pointer-events-none before:absolute before:inset-0 before:scale-[2.2222] before:rounded-full before:border-transparent before:content-[''] group-has-[:focus-visible]:before:border-[0.22px]",
      input: 'block size-full cursor-pointer opacity-0 select-none',
    },
    variants: {
      checked: {
        true: {
          thumb: 'translate-x-2.75 bg-primary-800 dark:bg-primary-600',
          track: 'bg-primary-200 dark:bg-primary-300',
        },
        false: {
          thumb: 'bg-grey-500',
          track: 'bg-black/25 dark:bg-grey-900',
        },
      },
      disabled: {
        true: {
          root: 'pointer-events-none',
          input: 'cursor-default',
        },
        false: {
          // Glow and focus indicator are only relevant while the switch is interactive. The glow
          // is driven off the root (`group-*`) rather than the thumb, since the transparent input
          // overlays the thumb and would otherwise win hit-testing, so `:hover`/`:active` on the
          // thumb itself never fire.
          thumb:
            'group-hover:before:bg-black/4 group-active:before:bg-black/8 group-has-[:focus-visible]:before:border-black',
        },
      },
    },
    compoundVariants: [
      {
        checked: true,
        disabled: true,
        class: {
          thumb: 'bg-primary-800/30 dark:bg-primary-600/30',
          track: 'bg-primary-800/15 dark:bg-primary-600/15',
        },
      },
      {
        checked: false,
        disabled: true,
        class: {
          thumb: 'bg-grey-300',
          track: 'bg-black/10',
        },
      },
    ],
    defaultVariants: {
      checked: false,
      disabled: false,
    },
  });

  export type SwitchVariants = VariantProps<typeof switchVariants>;

  export type SwitchProps = WithElementRef<
    WithoutChildren<
      Omit<HTMLInputAttributes, 'checked' | 'disabled' | 'role' | 'type'> & {
        /** Whether the `Switch` is checked. Defaults to `false`. Bindable. */
        readonly checked?: boolean;
        /** Whether the `Switch` is disabled. Defaults to `false`. */
        readonly disabled?: boolean;
        readonly class?: string;
      }
    >,
    HTMLInputElement
  >;
</script>

<script lang="ts">
  let {
    checked = $bindable(false),
    disabled = false,
    class: className,
    onclick,
    ref = $bindable(null),
    ...restProps
  }: SwitchProps = $props();

  const slots = $derived(switchVariants({checked, disabled}));
</script>

<!-- A11y is already covered by the contained checkbox. -->
<div class={cn(slots.root(), className)}>
  <div class={slots.track()}></div>
  <div class={slots.thumb()}></div>

  <input
    bind:this={ref}
    bind:checked
    class={slots.input()}
    aria-checked={checked}
    {disabled}
    role="switch"
    type="checkbox"
    {onclick}
    {...restProps}
  />
</div>
