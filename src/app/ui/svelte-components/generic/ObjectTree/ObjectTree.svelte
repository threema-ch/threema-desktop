<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import {
    parse,
    type TreeExpandEvent,
    type TreeItem,
    type TreeItemInfo,
    type TreeItemType,
  } from '.';

  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {limited, type LimitedArray} from '~/app/ui/svelte-components/utils/array';

  /**
   * Key of the associated object. Used in case the object is a child of
   * another object.
   */
  export let key = '';
  /**
   * Object to be displayed in the component.
   */
  export let object: TreeItem;
  /**
   * Maximum amount of children of the object to be displayed at once. The user
   * can expand the object by click on the `...` button.
   */
  export let limit = Number.POSITIVE_INFINITY;
  /**
   * Object and child object component types who will be handled by an
   * external component.
   *
   * If an object type chosen here has been selected, the `expand` event will
   * be fired for this type.
   */
  export let external: readonly TreeItemType[] = [];
  /**
   * Whether the tree view of the object is expanded.
   */
  export let isExpanded = false;

  const dispatch = createEventDispatcher();
  let info: TreeItemInfo;
  let limiter: number = limit;
  let children: LimitedArray<[key: string, object: TreeItem]>;

  function expand(): void {
    // Expand objects that have children
    if (info.children !== undefined) {
      isExpanded = !isExpanded;
    }

    // Dispatch the event to objects that should (also) be handled externally.
    if (external.includes(info.type)) {
      const detail: TreeExpandEvent['detail'] = {object, info};
      dispatch('expand', detail);
    }
  }

  // Parse the object and get its associated metadata
  $: info = parse(object);
  // Limit the amount of children displayed at once
  $: children = limited(info.children ?? [], limiter);
</script>

<template>
  <div
    class="wrapper"
    on:click={expand}
    class:expanded={isExpanded}
    class:clickable={children.items.length > 0 || external.includes(info.type)}
    title="{info.type}{info.length !== undefined ? `(${info.length})` : ''}"
  >
    <div class="marker" class:hide={children.items.length === 0}>
      <MdIcon theme="Filled">{isExpanded ? 'expand_more' : 'expand_less'}</MdIcon>
    </div>
    {#if key !== ''}
      <div class="key">{key}</div>
      <div class="separator">:</div>
    {/if}
    <div class="value" type={info.type}>
      {#if info.display.type}
        <span class="type">{info.type}</span>{#if info.length !== undefined}
          <span class="length">({info.length})</span>
        {/if}
      {/if}
      {#if info.display.value !== undefined}{info.display.value}{/if}
    </div>
  </div>
  {#if children.items.length > 0}
    <ul class:expanded={isExpanded}>
      {#each children.items as [itemKey, itemValue]}
        <li>
          <svelte:self
            key={itemKey}
            object={itemValue}
            {limit}
            {external}
            on:expand={(event) => dispatch('expand', event.detail)}
          />
        </li>
      {/each}
      {#if children.limited}
        <li
          class="clickable expand"
          title="Show all"
          on:click|once={() => (limiter = Number.POSITIVE_INFINITY)}
        >
          <MdIcon theme="Filled">expand_more</MdIcon>
        </li>
      {/if}
    </ul>
  {/if}
</template>

<style lang="scss">
  @use 'component' as *;

  .wrapper {
    font-family: var(--c-object-tree-font-family, default);
    display: flex;
    align-items: center;

    .marker {
      display: grid;
      margin: 0 em(4px);

      &.hide {
        visibility: hidden;
      }
    }

    .key {
      color: var(--c-object-tree-key-color, default);
      white-space: nowrap;
    }

    .separator {
      margin: 0 em(4px) 0 0;
    }

    &:hover {
      background-color: var(--c-object-tree-background-color--hover, default);
    }

    &.clickable {
      cursor: pointer;
    }

    .value {
      color: var(--c-object-tree-key-color, default);
      &[type='undefined'],
      &[type='null'] {
        color: var(--c-object-tree-null-color, default);
      }
      &[type='Boolean'] {
        color: var(--c-object-tree-bool-color, default);
      }
      &[type='Number'] {
        color: var(--c-object-tree-number-color, default);
      }
      &[type='String'] {
        color: var(--c-object-tree-string-color, default);
      }
      .length {
        color: var(--c-object-tree-length-color, default);
      }
    }
  }

  ul {
    display: none;
    padding: 0;
    margin: 0 0 0 em(12px);
    list-style-type: none;
    border-left: solid 1px var(--c-object-tree-border-color, default);

    &.expanded {
      display: block;
    }

    .expand {
      text-align: center;
      cursor: pointer;
    }
  }
</style>
