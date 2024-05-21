<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {u53} from '~/common/types';

  const dispatch = createEventDispatcher<{groupClicked: u53}>();

  let activeGroup = 0;

  /**
   * Update the active group.
   */
  export function setActiveGroup(groupId: u53): void {
    activeGroup = groupId;
  }

  /**
   * Handle a click on a group icon. Dispatch a 'groupClicked' event with the
   * group identifier.
   */
  function handleGroupClick(event: MouseEvent): void {
    const target = event.currentTarget;
    if (target === null) {
      return;
    }
    const groupId = (target as HTMLElement).dataset.group;
    if (groupId !== undefined) {
      dispatch('groupClicked', parseInt(groupId, 10));
    }
  }
</script>

<div class="groups" data-active-group={activeGroup}>
  <!-- Note: Copy-pasted from groups.html -->
  <button data-group="0" title="Smileys & Emotion" on:click={handleGroupClick}>
    <MdIcon theme="Outlined">emoji_emotions</MdIcon>
  </button>
  <button data-group="1" title="People & Body" on:click={handleGroupClick}>
    <MdIcon theme="Outlined">emoji_people</MdIcon>
  </button>
  <button data-group="3" title="Animals & Nature" on:click={handleGroupClick}>
    <MdIcon theme="Outlined">park</MdIcon>
  </button>
  <button data-group="4" title="Food & Drink" on:click={handleGroupClick}>
    <MdIcon theme="Outlined">restaurant</MdIcon>
  </button>
  <button data-group="5" title="Travel & Places" on:click={handleGroupClick}>
    <MdIcon theme="Outlined">train</MdIcon>
  </button>
  <button data-group="6" title="Activities" on:click={handleGroupClick}>
    <MdIcon theme="Outlined">emoji_events</MdIcon>
  </button>
  <button data-group="7" title="Objects" on:click={handleGroupClick}>
    <MdIcon theme="Outlined">emoji_objects</MdIcon>
  </button>
  <button data-group="8" title="Symbols" on:click={handleGroupClick}>
    <MdIcon theme="Outlined">emoji_symbols</MdIcon>
  </button>
  <button data-group="9" title="Flags" on:click={handleGroupClick}>
    <MdIcon theme="Outlined">flag</MdIcon>
  </button>
</div>

<style lang="scss">
  @use 'component' as *;

  .groups {
    display: grid;
    grid-template-columns: repeat(auto-fill, rem(28px));
    padding: rem(4px) 0 rem(8px);
    font-size: rem(19px);
    color: var(--c-emoji-picker-emoji-groups-icon-color);

    // Get rid of default button styling
    button {
      border: none;
      padding: 0;
      background: none;
      font-size: inherit;
      font-family: inherit;
      color: inherit;
      cursor: pointer;
    }

    button {
      height: 1em;
    }
  }

  @for $groupId from 0 through 9 {
    @if $groupId != 2 {
      .groups[data-active-group='#{$groupId}'] {
        button[data-group='#{$groupId}'] {
          color: var(--c-emoji-picker-emoji-groups-icon-color--active);
          transition: color 0.15s;
        }
      }
    }
  }
</style>
