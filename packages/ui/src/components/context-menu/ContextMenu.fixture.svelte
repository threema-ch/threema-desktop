<!--
  @component Test fixture which builds a `ContextMenu` out of plain data, so that a test can render
  a realistic menu without having to compose it in markup. Not part of the package's API.
-->

<script lang="ts" module>
  import type {Logger} from '@threema/ts-utils/logging/logger';
  import type {HTMLAttributes} from 'svelte/elements';

  import type {AwaitableMouseEventHandler} from '../../utils/mouse-event';
  import type {IconProps} from '../icon/Icon.svelte';

  import {ContextMenu} from './index';

  /**
   * An item of the fixture's menu, labelled by its `label`.
   */
  export interface ContextMenuFixtureItem {
    readonly checked?: boolean;
    readonly disabled?: boolean;
    readonly icon?: Pick<IconProps, 'font' | 'glyph'>;
    readonly label: string;
    readonly onclick?: AwaitableMouseEventHandler<HTMLButtonElement>;
  }

  /**
   * A section of the fixture's menu, labelled by its `heading` if it has one.
   */
  export interface ContextMenuFixtureGroup {
    readonly heading?: string;
    readonly items: readonly ContextMenuFixtureItem[];
  }

  export type ContextMenuFixtureProps = {
    /**
     * Sections to render after the ungrouped `items`. Defaults to none.
     */
    readonly groups?: readonly ContextMenuFixtureGroup[];
    /**
     * Items to render directly in the menu, i.e. without a section. Defaults to none.
     */
    readonly items?: readonly ContextMenuFixtureItem[];
    readonly log: Logger;
  } & HTMLAttributes<HTMLDivElement>;
</script>

<script lang="ts">
  const {groups = [], items = [], log, ...restProps}: ContextMenuFixtureProps = $props();
</script>

{#snippet renderItems(itemsToRender: readonly ContextMenuFixtureItem[])}
  {#each itemsToRender as item (item.label)}
    <ContextMenu.Item
      checked={item.checked}
      disabled={item.disabled}
      icon={item.icon}
      onclick={item.onclick}
    >
      {item.label}
    </ContextMenu.Item>
  {/each}
{/snippet}

<ContextMenu {log} {...restProps}>
  {@render renderItems(items)}

  {#each groups as group (group.heading ?? '')}
    {#if group.heading === undefined}
      <ContextMenu.Group>
        {@render renderItems(group.items)}
      </ContextMenu.Group>
    {:else}
      <ContextMenu.Group>
        {#snippet heading()}
          {group.heading}
        {/snippet}

        {@render renderItems(group.items)}
      </ContextMenu.Group>
    {/if}
  {/each}
</ContextMenu>
