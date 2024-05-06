<!--
  @component Renders a button which contains an icon, a label, and a stack of profile pictures.
-->
<script lang="ts">
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import RadialExclusionMaskProvider from '~/app/ui/components/hocs/radial-exclusion-mask-provider/RadialExclusionMaskProvider.svelte';
  import ProfilePicture from '~/app/ui/components/partials/profile-picture/ProfilePicture.svelte';
  import type {ProfilePictureButtonProps} from '~/app/ui/components/partials/profile-picture-button/props';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  type $$Props = ProfilePictureButtonProps;

  export let icon: $$Props['icon'];
  export let label: $$Props['label'];
  export let receivers: $$Props['receivers'];
  export let services: $$Props['services'];

  const DEFAULT_CUTOUT = {
    diameter: 46,
    position: {
      x: -40,
      y: 50,
    },
  };

  $: receiversSample = receivers.length > 3 ? receivers.slice(0, 2) : receivers;
</script>

<button class="container" on:click>
  <span class="content">
    <span class="icon">
      <MdIcon theme="Filled">{icon}</MdIcon>
    </span>

    <Text size="body-large" text={label} />
  </span>

  <div class="profile-pictures">
    {#each receiversSample as receiver, index (`${receiver.lookup.type}.${receiver.lookup.uid}`)}
      {#if index === 0}
        <ProfilePicture
          options={{
            hideCharms: true,
            isClickable: true,
          }}
          {receiver}
          {services}
          size="sm"
        />
      {:else}
        <RadialExclusionMaskProvider cutouts={[DEFAULT_CUTOUT]}>
          <ProfilePicture
            options={{
              hideCharms: true,
              isClickable: true,
            }}
            {receiver}
            {services}
            size="sm"
          />
        </RadialExclusionMaskProvider>
      {/if}
    {/each}

    {#if receivers.length > 3}
      <RadialExclusionMaskProvider cutouts={[DEFAULT_CUTOUT]}>
        <span class="counter">
          <Text size="body-large" text={`+${receivers.length - 2}`} />
        </span>
      </RadialExclusionMaskProvider>
    {/if}
  </div>
</button>

<style lang="scss">
  @use 'component' as *;

  .container {
    @extend %neutral-input;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: rem(12px);

    padding: rem(3px);
    border-radius: 23px;
    background-color: var(--cc-profile-picture-button-background-color);

    box-shadow: var(--cc-profile-picture-button-box-shadow-color);
    transform: translate3d(0, 0, 0) scale3d(1, 1, 1);

    transition-duration: 0.25s;
    transition-timing-function: cubic-bezier(0.05, 0.5, 0.1, 1);
    transition-property: box-shadow, transform;
    backface-visibility: hidden;

    .content {
      display: flex;
      align-items: center;
      justify-content: left;
      gap: rem(8px);

      padding-left: rem(10px);
      color: var(--t-color-primary-600);

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;

        font-size: rem(22px);
      }
    }

    .profile-pictures {
      display: flex;
      align-items: center;
      justify-content: right;

      min-height: rem(40px);

      .counter {
        display: flex;
        align-items: center;
        justify-content: center;

        width: rem(40px);
        height: rem(40px);
        border-radius: rem(20px);

        background-color: var(--cc-profile-picture-button-counter-background-color);
        color: var(--cc-profile-picture-button-counter-text-color);
      }

      & :global(> .container:not(:last-child)) {
        margin-right: rem(-4px);
      }
    }

    &:hover {
      cursor: pointer;

      box-shadow: var(--cc-profile-picture-button-box-shadow-color--hover);
      transform: translate3d(0, rem(-1px), 0) scale3d(1.025, 1.025, 1.025);
    }
  }
</style>
