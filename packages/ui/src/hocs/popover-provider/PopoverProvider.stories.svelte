<script module lang="ts">
  import {defineMeta} from '@storybook/addon-svelte-csf';

  import Button from '../../components/button/Button.svelte';

  import PopoverProvider from './PopoverProvider.svelte';

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const {Story} = defineMeta({
    title: 'HOCs/PopoverProvider',
    component: PopoverProvider,
    args: {
      align: 'center',
      placement: 'block-end',
    },
    argTypes: {
      align: {
        control: 'inline-radio',
        options: ['start', 'center', 'end'],
      },
      placement: {
        control: 'inline-radio',
        options: ['block-start', 'block-end', 'inline-start', 'inline-end'],
      },
    },
    tags: ['autodocs'],
  });

  const log = console;

  const rows = Array.from({length: 10}, (unused, index) => `Row ${index + 1}`);
</script>

<script lang="ts">
  let isFirstOpen = $state<boolean>(false);
  let isSecondOpen = $state<boolean>(false);
  let isThirdOpen = $state<boolean>(false);
  let isFourthOpen = $state<boolean>(false);
</script>

<!--
  The component does not decide when it opens. Here the consumer toggles its own state when the
  trigger is clicked, and clears it when a click lands outside of both the trigger and the popover.
-->
<Story name="Click to Toggle">
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <PopoverProvider
        {...args}
        isOpen={isFirstOpen}
        onclickoutside={() => (isFirstOpen = false)}
        onclicktrigger={() => (isFirstOpen = !isFirstOpen)}
      >
        {#snippet anchor(props)}
          <Button {...props} {log} variant="primary">Toggle popover</Button>
        {/snippet}

        {#snippet popover()}
          <!--
            The component imposes no styling on its content, so the card below is entirely the
            consumer's.
          -->
          <div
            class="w-64 rounded-lg bg-white p-4 text-grey-900 shadow-lg dark:bg-grey-800 dark:text-grey-50"
          >
            <p class="text-base">
              This is rendered in the top layer, so it is not clipped by any ancestor.
            </p>
          </div>
        {/snippet}
      </PopoverProvider>
    </div>
  {/snippet}
</Story>

<!--
  Popover component which is wired to hover callbacks. The trigger and the popover form a single
  hover region, so moving the pointer from the trigger into the popover keeps it open, and its
  content stays interactive.
-->
<Story name="Hover to Reveal">
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <PopoverProvider
        {...args}
        isOpen={isSecondOpen}
        onhoverend={() => (isSecondOpen = false)}
        onhoverstart={() => (isSecondOpen = true)}
      >
        {#snippet anchor(props)}
          <Button {...props} {log} variant="secondary">Hover me</Button>
        {/snippet}

        {#snippet popover()}
          <div
            class="flex w-64 flex-col items-start gap-3 rounded-lg bg-white p-4 text-grey-900 shadow-lg dark:bg-grey-800 dark:text-grey-50"
          >
            <p class="text-base">Popover stays open if pointer is moved here.</p>
          </div>
        {/snippet}
      </PopoverProvider>
    </div>
  {/snippet}
</Story>

<!--
  A popover which is wider than its trigger, aligned with one of the trigger's edges instead of
  being centered on it. This is the usual arrangement for a menu opened by a small chevron. The
  alignment survives the user agent flipping the popover to the other side, and if the popover does
  not fit towards the opposite edge either, it flips the alignment as well.
-->
<Story name="Aligned to the Trigger Edge" args={{align: 'end', placement: 'block-start'}}>
  {#snippet template(args)}
    <div class="grid min-h-60 place-items-center">
      <PopoverProvider
        {...args}
        isOpen={isThirdOpen}
        onclickoutside={() => (isThirdOpen = false)}
        onclicktrigger={() => (isThirdOpen = !isThirdOpen)}
      >
        {#snippet anchor(props)}
          <Button
            {...props}
            {log}
            aria-label="Choose a microphone"
            icon={{glyph: 'keyboard_arrow_up'}}
            shape="circle"
            variant="neutral"
          />
        {/snippet}

        {#snippet popover()}
          <div
            class="w-64 rounded-lg bg-white p-4 text-grey-900 shadow-lg dark:bg-grey-800 dark:text-grey-50"
          >
            <p class="text-base">One of my edges lines up with the button's.</p>
          </div>
        {/snippet}
      </PopoverProvider>
    </div>
  {/snippet}
</Story>

<!--
  A popover whose trigger sits inside a scrollable container. Because the popover is rendered in the
  top layer, it is not clipped by the container, and it follows its trigger while scrolling. Leave
  it open and scroll to watch it flip to the opposite side as space runs out, and to see it
  disappear once its trigger has scrolled out of view.
-->
<Story name="Inside a Scroll Container">
  {#snippet template(args)}
    <div
      class="h-72 w-80 overflow-y-auto rounded-lg border border-grey-300 bg-grey-50 dark:border-grey-700 dark:bg-grey-900"
    >
      <div class="flex flex-col items-center gap-6 p-6 text-grey-500 dark:text-grey-400">
        {#each rows as row (row)}
          <p class="text-base">{row}</p>
        {/each}

        <PopoverProvider
          {...args}
          isOpen={isFourthOpen}
          onclickoutside={() => (isFourthOpen = false)}
          onclicktrigger={() => (isFourthOpen = !isFourthOpen)}
        >
          {#snippet anchor(props)}
            <Button {...props} {log} variant="primary">Toggle popover</Button>
          {/snippet}

          {#snippet popover()}
            <div
              class="w-64 rounded-lg bg-white p-4 text-grey-900 shadow-lg dark:bg-grey-800 dark:text-grey-50"
            >
              <p class="text-base">Scroll the container to move my trigger around.</p>
            </div>
          {/snippet}
        </PopoverProvider>

        {#each rows as row (row)}
          <p class="text-base">{row}</p>
        {/each}
      </div>
    </div>
  {/snippet}
</Story>
