<script lang="ts">
  import {type SvelteComponentDev} from 'svelte/internal';

  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import DebugBackend from '~/app/components/debug/DebugBackend.svelte';
  import DebugNetwork from '~/app/components/debug/DebugNetwork.svelte';
  import DebugRedis from '~/app/components/debug/DebugRedis.svelte';
  import DebugStorage from '~/app/components/debug/DebugStorage.svelte';
  import Threema from '~/app/components/debug/Threema.svelte';
  import {type AppServices} from '~/app/types';
  import {MouseEventButtons} from '~/common/enum';

  /* eslint-disable @typescript-eslint/naming-convention */
  const TOOLS: {[key: string]: typeof SvelteComponentDev} = {
    Backend: DebugBackend,
    Redis: DebugRedis,
    Network: DebugNetwork,
    Storage: DebugStorage,
    Threema,
  };
  /* eslint-enable @typescript-eslint/naming-convention */

  export let services: AppServices;

  // Unpack services
  export let {storage} = services;

  // Unpack stores
  const {debugPanelHeight} = storage;

  let selected: typeof SvelteComponentDev = DebugBackend;

  // Resize when dragging the footer bar
  let container: HTMLElement;
  let topBar: HTMLElement;
  function resize(init: PointerEvent): void {
    // Ignore if not the primary button
    // eslint-disable-next-line no-bitwise
    if ((init.buttons & MouseEventButtons.PRIMARY) === 0) {
      return;
    }

    // Register move updates
    function update(move: PointerEvent): void {
      const rect = container.getBoundingClientRect();
      container.style.height = `${rect.height - move.movementY}px`;
    }
    topBar.addEventListener('pointermove', update);

    // Start capture and stop once pointer moved up or is being cancelled
    topBar.setPointerCapture(init.pointerId);
    function stop(): void {
      topBar.removeEventListener('pointermove', update);
      topBar.releasePointerCapture(init.pointerId);
      debugPanelHeight.set(container.style.height);
    }
    topBar.addEventListener('pointerup', stop, {once: true});
    topBar.addEventListener('pointercancel', stop, {once: true});
  }
</script>

<template>
  <section bind:this={container} class="debug" style:height={$debugPanelHeight}>
    <nav bind:this={topBar} on:pointerdown|self={resize}>
      <div class="title" title="Debug Panel">
        <MdIcon theme="Filled">bug_report</MdIcon>
      </div>
      {#each Object.entries(TOOLS) as [name, tool]}
        <div class:selected={selected === tool} on:click={() => (selected = tool)}>{name}</div>
      {/each}
    </nav>

    <div class="panel">
      <svelte:component this={selected} {services} />
    </div>
  </section>
</template>

<style lang="scss">
  @use 'component' as *;

  .debug {
    width: 100%;
    min-height: 100px;
    max-height: 80vh;
    overflow: hidden;
    display: grid;
    grid-template:
      'header' minmax(0, auto)
      'content' minmax(0, 1fr)
      / auto;
    color: var(--t-text-e1-color);
  }

  nav {
    background-color: var(--dc-top-bar-background-color);
    cursor: row-resize;
    user-select: none;

    display: flex;
    place-items: center;

    > * {
      padding: 0 rem(4px);
      border-top: solid transparent rem(2px);
      cursor: pointer;

      &.title {
        cursor: auto;
        display: grid;
      }

      &:not(.title) {
        &.selected,
        &:hover {
          border-top-color: var(--dc-top-bar-border-color);
        }
      }
    }
  }

  .panel {
    overflow: scroll;
    background-color: var(--t-nav-background-color);
  }
</style>
