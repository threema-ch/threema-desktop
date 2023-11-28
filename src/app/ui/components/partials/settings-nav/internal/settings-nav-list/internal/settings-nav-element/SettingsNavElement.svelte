<script lang="ts">
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import {ROUTE_DEFINITIONS} from '~/app/routing/routes';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {SettingsNavElementProps} from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/internal/settings-nav-element/props';

  type $$Props = SettingsNavElementProps;

  export let services: $$Props['services'];

  export let category: $$Props['category'];
  export let settingsInformation: $$Props['settingsInformation'];

  const {router} = services;

  function onClickSettings(): void {
    router.replaceMain(ROUTE_DEFINITIONS.main.settings.withTypedParams({category}));
  }

  $: isActive = $router.main.id === 'settings' ? $router.main.params.category === category : false;
</script>

<button class="container" class:active={isActive} on:click={onClickSettings}>
  <span class="icon">
    <MdIcon theme="Outlined">{settingsInformation.icon}</MdIcon>
  </span>
  <div class="content">
    <Text text={settingsInformation.title} size="body" />
    <Text text={settingsInformation.subText} emphasis="low" size="body-small" />
  </div>
</button>

<style lang="scss">
  @use 'component' as *;
  $-temp-vars: (--cc-t-background-color);
  $-fade-width: rem(48px);

  .container {
    @extend %neutral-input;
    cursor: pointer;

    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: stretch;
    gap: rem(12px);
    padding: rem(10px) rem(16px);
    width: 100%;

    .icon {
      display: flex;
      place-items: center;
      font-size: rem(24px);
      line-height: rem(24px);
      color: var(--c-menu-item-icon-color);
      padding: rem(8px);
    }

    .content {
      display: flex;
      flex-direction: column;
      align-items: start;
      justify-content: start;
    }

    @include def-var(
      $--ic-swipe-area-right-size: 75%,
      $--cc-profile-picture-overlay-background-color: var($-temp-vars, --cc-t-background-color)
    );
    background-color: var($-temp-vars, --cc-t-background-color);

    &:hover {
      @include def-var(
        $-temp-vars,
        --cc-t-background-color,
        var(--cc-conversation-preview-background-color--hover)
      );
    }

    &.active {
      @include def-var(
        $-temp-vars,
        --cc-t-background-color,
        var(--cc-conversation-preview-background-color--active)
      );
    }
  }
</style>
