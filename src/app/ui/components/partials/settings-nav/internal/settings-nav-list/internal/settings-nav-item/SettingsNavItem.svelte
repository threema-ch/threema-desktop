<!--
  @component
  Renders a single list item in the settings navigation sidebar.
-->
<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {SettingsNavItemProps} from '~/app/ui/components/partials/settings-nav/internal/settings-nav-list/internal/settings-nav-item/props';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  type $$Props = SettingsNavItemProps;

  export let iconName: $$Props['iconName'];
  export let isActive: NonNullable<$$Props['isActive']> = false;
  export let subtitle: $$Props['subtitle'];
  export let title: $$Props['title'];
</script>

<button class="container" class:active={isActive} on:click>
  <span class="icon">
    <MdIcon theme="Outlined">{iconName}</MdIcon>
  </span>
  <div class="content">
    <Text text={title} color="mono-high" family="secondary" size="body" />
    <Text text={subtitle} color="mono-low" family="secondary" size="body-small" />
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
