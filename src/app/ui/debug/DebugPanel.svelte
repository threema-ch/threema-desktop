<script lang="ts">
  import type {SvelteComponent} from 'svelte';

  import type {AppServices} from '~/app/types';
  import DebugBackend from '~/app/ui/debug/DebugBackend.svelte';
  import DebugFrontend from '~/app/ui/debug/DebugFrontend.svelte';
  import DebugNetwork from '~/app/ui/debug/DebugNetwork.svelte';
  import DebugRedis from '~/app/ui/debug/DebugRedis.svelte';
  import DebugStorage from '~/app/ui/debug/DebugStorage.svelte';
  import Threema from '~/app/ui/debug/Threema.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {MouseEventButtons} from '~/common/enum';

  /* eslint-disable @typescript-eslint/naming-convention */
  const TOOLS: Record<string, typeof SvelteComponent<{services: AppServices}>> = {
    Backend: DebugBackend,
    Frontend: DebugFrontend,
    Redis: DebugRedis,
    Network: DebugNetwork,
    Storage: DebugStorage,
    Threema,
  };
  /* eslint-enable @typescript-eslint/naming-convention */

  export let services: AppServices;

  // Unpack services
  const {storage} = services;

  // Unpack stores
  const {debugPanelHeight} = storage;

  let selected: typeof SvelteComponent<{services: AppServices}> = DebugBackend;

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
        <button class="tab" class:selected={selected === tool} on:click={() => (selected = tool)}>
          {name}
        </button>
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
    user-select: text;
  }

  nav {
    background-color: var(--dc-top-bar-background-color);
    cursor: row-resize;
    user-select: none;

    display: flex;
    place-items: center;

    .title {
      cursor: auto;
      display: grid;
    }

    .tab {
      @include clicktarget-button-rect;

      &.selected,
      &:hover {
        border-top-color: var(--dc-top-bar-border-color);
      }
    }

    .title,
    .tab {
      padding: 0 rem(4px);
      border-top: solid transparent rem(2px);
      cursor: pointer;
    }
  }

  .panel {
    overflow: scroll;
    background-color: var(--t-nav-background-color);
  }
</style>
