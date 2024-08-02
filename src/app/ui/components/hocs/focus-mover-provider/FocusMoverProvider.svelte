<!--
  @component Monitors its tree of descendants and moves focus between `<a>` and `<button>` elements
  if the respective keys are pressed. Note: disabled elements will be ignored.
-->
<script lang="ts">
  import {onDestroy, onMount} from 'svelte';

  import type {FocusMoverProviderProps} from '~/app/ui/components/hocs/focus-mover-provider/props';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = FocusMoverProviderProps;

  export let nextKey: $$Props['nextKey'] = 'ArrowDown';
  export let previousKey: $$Props['previousKey'] = 'ArrowUp';

  let element: SvelteNullableBinding<HTMLDivElement> = null;

  /**
   * Focus a descandant `<a>` or `<button>` of this `FocusMoverProvider` according to the given
   * `selector`. Note:
   * - If none of the elements in the subtree are currently selected and `"next"` is used, `"first"`
   *   will be selected instead. Same for `"previous"`, which will start at `"last"`.
   * - If the last element is focused and `"next"` is used, focus will be given to the first
   *   element, and vice versa.
   * - If the tree contains subtrees of nested `button`s or `a`s, only the outermost non-disabled
   *   element of each subtree will be focusable.
   *
   * @returns A reference to the {@link HTMLElement} that was focused, or `undefined` if none was
   *   focused.
   */
  export function focusChild(
    selector: 'first' | 'last' | 'next' | 'previous',
  ): HTMLAnchorElement | HTMLButtonElement | undefined {
    const elements = Array.from(
      element?.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>(
        /*
         * Select all `a` or `button` elements that fulfill the following conditions:
         * - It's not disabled.
         * - It's not a descendant of another (non-disabled) `a` or `button` (Example: `a:not(a *)`
         *   selects all `a` elements that don't have another `a` as a parent).
         */
        'a:not(:disabled):not(a:not(:disabled) *):not(button:not(:disabled) *), button:not(:disabled):not(a:not(:disabled) *):not(button:not(:disabled) *)',
      ) ?? [],
    );

    switch (selector) {
      case 'first': {
        const elementToFocus = elements.at(0);
        elementToFocus?.focus();
        return elementToFocus;
      }

      case 'last': {
        const elementToFocus = elements.at(-1);
        elementToFocus?.focus();
        return elementToFocus;
      }

      case 'next':
      case 'previous': {
        const focusedElementIndex = elements.findIndex((el) => el === document.activeElement);
        if (focusedElementIndex === -1) {
          // None of the elements in the subtree are currently selected, so we start at `"first"` or
          // `"last"`.
          return focusChild(selector === 'next' ? 'first' : 'last');
        } else if (selector === 'next' && focusedElementIndex + 1 === elements.length) {
          // We're already on the last element, so `"next"` focuses `"first"` instead.
          return focusChild('first');
        } else if (selector === 'next') {
          const elementToFocus = elements.at(focusedElementIndex + 1);
          elementToFocus?.focus();
          return elementToFocus;
        } else if (focusedElementIndex === 0) {
          // We're already on the first element, so `"previous"` focuses `"last"` instead.
          return focusChild('last');
        }

        const elementToFocus = elements.at(focusedElementIndex - 1);
        elementToFocus?.focus();
        return elementToFocus;
      }

      default:
        return unreachable(selector);
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    let focused: HTMLElement | undefined = undefined;
    switch (event.key) {
      case nextKey: {
        focused = focusChild('next');
        break;
      }

      case previousKey: {
        focused = focusChild('previous');
        break;
      }

      default:
        break;
    }

    if (focused !== undefined) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  onMount(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    element?.addEventListener('keydown', handleKeyDown);
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
  onDestroy(() => element?.removeEventListener('keydown', handleKeyDown));
</script>

<div bind:this={element}>
  <slot />
</div>
