<!--
  @component Renders a tab switcher.
-->
<script lang="ts" generics="TId">
  import type {TabBarProps} from '~/app/ui/components/molecules/tab-bar/props';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import type {u53} from '~/common/types';

  type $$Props = TabBarProps<TId>;

  export let tabs: $$Props['tabs'];

  let activeId: TId | undefined = tabs.at(0)?.id;

  function handleClickTab(tab: (typeof tabs)[u53]): void {
    activeId = tab.id;
    tab.onClick?.(tab.id);
  }
</script>

<div class="container">
  {#each tabs as tab (`${tab.id}`)}
    {@const active = tab.id === activeId}

    <button
      class="tab"
      class:active
      disabled={tab.disabled ?? false}
      on:click={() => handleClickTab(tab)}
    >
      <MdIcon theme="Outlined">{tab.icon}</MdIcon>
    </button>
  {/each}
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: stretch;
    gap: rem(4px);

    .tab {
      @extend %neutral-input;

      flex: 1 0 auto;

      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;

      user-select: none;
      height: rem(40px);
      border: solid 1px;
      border-color: transparent;
      border-radius: rem(8px);
      color: var(--ic-contact-navigation-context-button-color);
      font-size: rem(24px);

      &:not(:disabled) {
        cursor: pointer;

        &:hover {
          border-color: transparent;
          background-color: var(--ic-contact-navigation-context-button-background-color--hover);
        }

        &:focus-visible {
          border-color: var(--ic-contact-navigation-context-button-border-color--focus);
          background-color: var(--ic-contact-navigation-context-button-background-color--focus);
        }

        &:active,
        &.active {
          color: var(--ic-contact-navigation-context-button-color--active);
          border-color: transparent;
          background-color: var(--ic-contact-navigation-context-button-background-color--active);

          &:focus-visible {
            border-color: var(--ic-contact-navigation-context-button-border-color--focus);
          }
        }
      }

      &:disabled {
        opacity: var(--ic-contact-navigation-context-button-opacity--disabled);
      }
    }
  }
</style>
