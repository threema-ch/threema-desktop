<!--
  @component A control of a call, i.e. a circular button which turns something on or off, with an
  optional menu of choices attached to it.

  A control of type `'toggle'` has a separate "on" and "off" state, which must be controlled by the
  parent component via the `isActive` prop.

  @example
  ```svelte
  <CallView.Control
    icon={{glyph: isMicrophoneEnabled ? 'mic' : 'mic_off'}}
    isActive={isMicrophoneEnabled}
    label="Microphone"
    {log}
    onclick={handleClickToggleMicrophone}
    popover={{label: 'Select microphone', content: microphoneContextMenu}}
    type="toggle"
  />

  <CallView.Control
    icon={{glyph: 'call_end'}}
    label="Leave call"
    {log}
    onclick={handleClickLeave}
    type="button"
    variant="destructive"
  />
  ```
-->

<script lang="ts" module>
  import type {Logger} from '@threema/ts-utils/logging/logger';
  import type {Snippet} from 'svelte';
  import type {HTMLAttributes} from 'svelte/elements';
  import {cn} from 'tailwind-variants';

  import Button, {type ButtonProps} from '../../components/button/Button.svelte';
  import type {IconProps} from '../../components/icon/Icon.svelte';
  import {CharmsProvider} from '../../hocs/charms-provider';
  import PopoverProvider from '../../hocs/popover-provider/PopoverProvider.svelte';
  import type {WithoutChildren} from '../../utils/children';
  import type {WithElementRef} from '../../utils/element';
  import type {AwaitableMouseEventHandler} from '../../utils/mouse-event';

  type BaseProps = WithElementRef<
    {
      /**
       * Whether interactions with the toggle (and the menu) are disallowed.
       */
      readonly disabled?: boolean;
      readonly icon: Pick<IconProps, 'font' | 'glyph'>;
      /**
       * Accessible name of the control, e.g. `'Microphone'`.
       */
      readonly label: string;
      readonly log: Logger;
      /**
       * An optional popover to attach to the control, which can be opened via a chevron. If
       * `undefined`, no chevron will be rendered.
       */
      readonly popover?: {
        /**
         * Accessible name of the chevron which opens the popover, e.g. `'Select microphone'`.
         */
        readonly label: string;
        /**
         * Component to render as the content of the popover. Usually, a `ContextMenu` component
         * should be passed here.
         */
        readonly content: Snippet;
      };
      readonly onclick?: AwaitableMouseEventHandler<HTMLButtonElement>;
    },
    HTMLDivElement
  >;

  type ButtonControlProps = BaseProps &
    WithoutChildren<Omit<HTMLAttributes<HTMLDivElement>, 'onclick' | 'on:click' | 'popover'>> & {
      /**
       * A control of type `'button'` never has a toggled state.
       */
      readonly isActive?: never;
      readonly type: 'button';
      /**
       * Color of the control. Defaults to `'neutral'`.
       */
      readonly variant?: Extract<ButtonProps['variant'], 'destructive' | 'neutral'>;
    };

  type ToggleControlProps = BaseProps &
    WithoutChildren<Omit<HTMLAttributes<HTMLDivElement>, 'onclick' | 'on:click' | 'popover'>> & {
      /**
       * Whether the control is currently "on" or "off".
       */
      readonly isActive: boolean;
      readonly type: 'toggle';
      /**
       * A control of type `'toggle'` always alternates between `'neutral'` and `'success'`, so the
       * variant is never customizable.
       */
      readonly variant?: never;
    };

  export type ControlProps = ButtonControlProps | ToggleControlProps;
</script>

<script lang="ts">
  let {
    class: className,
    disabled = false,
    icon,
    isActive,
    label,
    log,
    onclick,
    popover,
    ref = $bindable(null),
    type,
    variant = 'neutral',
    ...restProps
  }: ControlProps = $props();

  let isPopoverOpen = $state<boolean>(false);

  const buttonVariant = $derived<ButtonProps['variant']>(
    type === 'toggle' && isActive === true ? 'success' : variant,
  );
</script>

<!-- The padding ensures the component's bounds include the chevron. -->
<div bind:this={ref} class={cn('relative inline-flex p-1.5', className)} {...restProps}>
  <CharmsProvider>
    {#snippet charms()}
      {#if popover !== undefined}
        <CharmsProvider.Charm position={{type: 'radial', degrees: 45, offsetPx: {x: 2, y: -2}}}>
          <PopoverProvider
            align="end"
            isOpen={isPopoverOpen}
            onclickoutside={() => (isPopoverOpen = false)}
            onclicktrigger={() => (isPopoverOpen = !isPopoverOpen)}
            placement="block-start"
            popover={popover.content}
          >
            {#snippet anchor(anchorProps)}
              <Button
                {...anchorProps}
                aria-label={popover.label}
                class="flex size-5 p-0 text-base"
                {disabled}
                icon={{glyph: 'keyboard_arrow_up'}}
                {log}
                shape="circle"
                type="button"
                variant="neutral"
              />
            {/snippet}
          </PopoverProvider>
        </CharmsProvider.Charm>
      {/if}
    {/snippet}

    <Button
      aria-label={label}
      aria-pressed={isActive}
      class="size-11.5"
      {disabled}
      {icon}
      {log}
      {onclick}
      shape="circle"
      type="button"
      variant={buttonVariant}
    />
  </CharmsProvider>
</div>
