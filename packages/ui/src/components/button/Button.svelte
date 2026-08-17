<!--
  @component A button, rendered as a `<button>`, or as an `<a>` if an `href` is given.

  A `'circle'` shaped button is intended to contain nothing but an `icon`, and defaults to a 40px
  button containing a 24px icon. Because it has no text, it needs an accessible name of its own.

  Its size is determined by its font size and its padding, both of which can be overridden with the
  `class` prop, i.e. `class="p-3"` results in a 48px button, and `class="p-1 text-lg"` in a 26px
  one.

  @example
  ```svelte
  <Button {log} onclick={handleClickSend}>Send</Button>

  <Button
    {log}
    aria-label="Mute microphone"
    icon={{glyph: 'mic_off'}}
    onclick={handleClickMute}
    shape="circle"
    variant="neutral"
  />
  ```
-->
<script lang="ts" module>
  import type {Logger} from '@threema/ts-utils/logging/logger';
  import type {HTMLAnchorAttributes, HTMLButtonAttributes} from 'svelte/elements';
  import {type VariantProps, cn, tv} from 'tailwind-variants';

  import type {WithChildren, WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';
  import Icon, {type IconProps} from '../icon/Icon.svelte';

  export const buttonVariants = tv({
    slots: {
      root: 'inline-flex shrink-0 items-center justify-center gap-2 text-base font-normal whitespace-nowrap ring-black transition-all outline-none select-none ring-inset hover:cursor-pointer focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:ring-white',
    },
    variants: {
      shape: {
        rectangle: {
          root: 'rounded-lg px-6 py-2',
        },
        circle: {
          root: 'aspect-square rounded-full p-2 text-2xl',
        },
      },
      variant: {
        primary: {
          root: 'bg-primary-800 text-white hover:bg-primary-900 dark:bg-primary-500 dark:text-grey-900 dark:hover:bg-primary-400 dark:active:bg-primary-500',
        },
        secondary: {
          root: 'bg-transparent text-primary-800 hover:bg-black/5 active:bg-black/10 dark:text-primary-500',
        },
        neutral: {
          root: 'bg-grey-200 text-grey-900 hover:bg-grey-300 active:bg-grey-400 dark:bg-grey-800 dark:text-grey-50 dark:hover:bg-grey-700 dark:active:bg-grey-600',
        },
        destructive: {
          root: 'bg-destructive-500 text-white hover:bg-destructive-600',
        },
        success: {
          root: 'bg-success-500 text-white hover:bg-success-600',
        },
      },
    },
    defaultVariants: {
      shape: 'rectangle',
      variant: 'primary',
    },
  });

  type ButtonVariants = VariantProps<typeof buttonVariants>;

  type BaseProps = WithElementRef<
    WithChildren<{
      /**
       * An icon to render to the left of the button content.
       */
      readonly icon?: Pick<IconProps, 'font' | 'glyph'>;
      /**
       * Logger to report errors to, e.g. if an asynchronous `onclick` handler rejects.
       */
      readonly log: Logger;
      /**
       * Shape of the button. A `'circle'` button is intended to contain nothing but an `icon`.
       * Defaults to `'rectangle'`.
       */
      readonly shape?: ButtonVariants['shape'];
      readonly variant?: ButtonVariants['variant'];
    }>
  >;

  type AnchorElementProps = BaseProps &
    WithoutChildren<Omit<HTMLAnchorAttributes, 'href' | 'onclick' | 'on:click' | 'type'>> & {
      readonly 'disabled'?: HTMLButtonAttributes['disabled'];
      readonly 'href': HTMLAnchorAttributes['href'];
      /**
       * Do not use `onclick` for links.
       */
      readonly 'onclick'?: never;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      readonly 'on:click'?: never;
      readonly 'type'?: never;
    };

  type AwaitableMouseEventHandler = (
    event: MouseEvent & {readonly currentTarget: EventTarget & HTMLButtonElement},
  ) => // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any | Promise<any>;

  type ButtonElementProps = BaseProps &
    WithoutChildren<Omit<HTMLButtonAttributes, 'href' | 'onclick' | 'on:click' | 'type'>> & {
      readonly 'disabled'?: HTMLButtonAttributes['disabled'];
      readonly 'href'?: never;
      /**
       * Callback to call when the button is triggered. Note: If a `Promise` is passed, the button
       * will be disabled and display a loading state until the promise is resolved as soon as it
       * has been triggered.
       */
      readonly 'onclick'?: AwaitableMouseEventHandler;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      readonly 'on:click'?: never;
      readonly 'type'?: HTMLButtonAttributes['type'];
    };

  export type ButtonProps = AnchorElementProps | ButtonElementProps;
</script>

<script lang="ts">
  import {isPromise} from '@threema/ts-utils/promise/is-promise';

  import Spinner from '../spinner/Spinner.svelte';

  let {
    children,
    class: className,
    disabled = false,
    href,
    icon,
    log,
    onclick,
    ref = $bindable(null),
    shape = 'rectangle',
    type,
    variant = 'primary',
    ...restProps
  }: ButtonProps = $props();

  const elementType = $derived(href === undefined || href === null ? 'button' : 'a');

  const slots = $derived(buttonVariants({shape, variant}));

  let isLoading = $state<boolean>(false);
  const isDisabled = $derived(disabled === true || isLoading);

  /**
   * Synchronous handler for click events on a `HTMLButtonElement`. If the `onclick` prop is an
   * async function, `isLoading` will be set to `true` until the returned `Promise` is resolved.
   */
  function handleOnClick(
    event: MouseEvent & {readonly currentTarget: EventTarget & HTMLElement},
  ): void {
    if (
      // Ignore the click event if no handler was passed.
      onclick === undefined ||
      // Ignore the click event if the button is disabled or in a loading state.
      isDisabled ||
      isLoading ||
      // We only expect to receive click events if the element is a `HTMLButtonElement`.
      !(event.currentTarget instanceof HTMLButtonElement)
    ) {
      return;
    }

    event.preventDefault();

    // Cast necessary because TypeScript doesn't narrow the type of `currentTarget`.
    const result = onclick(event as MouseEvent & {currentTarget: EventTarget & HTMLButtonElement});
    if (isPromise(result)) {
      isLoading = true;
      result
        .catch((error: unknown) => {
          log.error("An error occurred in Button 'onclick' handler: ", error);
        })
        .finally(() => {
          isLoading = false;
        });
    }
  }
</script>

<svelte:element
  this={elementType}
  bind:this={ref}
  aria-disabled={elementType === 'a' ? isDisabled : undefined}
  class={slots.root({
    class: cn(
      // Tighten the padding next to an icon. A circular button has symmetric padding by definition.
      shape === 'rectangle' && icon !== undefined && 'pl-4',
      className,
      // Note: `leading-none` is deliberately applied *after* the external `className`, unlike every other
      // class of this component. This is required because `font-size` conflicts with `leading` in
      // `tailwind-merge`, so `"leading-none"` is not overridden if the consumer passes a `"text-<size>"`
      // class to size the circular button.
      shape === 'circle' && 'leading-none',
    ),
  })}
  disabled={elementType === 'a' ? undefined : isDisabled}
  href={elementType === 'a' && !isDisabled ? href : undefined}
  onclick={elementType === 'a' ? undefined : handleOnClick}
  role={elementType === 'a' && isDisabled ? 'link' : undefined}
  tabindex={elementType === 'a' && isDisabled ? -1 : 0}
  type={elementType === 'a' ? undefined : type}
  {...restProps}
>
  {#if icon !== undefined}
    {#if isLoading}
      <!--
        Replace the icon with a same-size spinner during loading so the button layout does not
        shift. Set its size to match the line-height of the button text.
      -->
      <Spinner class="size-[1lh]" />
    {:else}
      <Icon {...icon} />
    {/if}
  {/if}
  {@render children?.()}
</svelte:element>
