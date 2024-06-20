<!--
  @component Renders details about a receiver as a card (profile picture, title and subtitle,
  badges, and icons).
-->
<script lang="ts">
  import ProfilePicture from '~/app/ui/components/partials/profile-picture/ProfilePicture.svelte';
  import ContentItem from '~/app/ui/components/partials/receiver-card/internal/content-item/ContentItem.svelte';
  import type {ReceiverCardProps} from '~/app/ui/components/partials/receiver-card/props';

  type $$Props = ReceiverCardProps;

  export let content: NonNullable<$$Props['content']> = {};
  export let options: NonNullable<$$Props['options']> = {};
  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];
  export let size: NonNullable<$$Props['size']> = 'md';
  export let unreadMessageCount: NonNullable<$$Props['unreadMessageCount']> = 0;

  $: ({topLeft = [], topRight = [], bottomLeft = [], bottomRight = []} = content);
  $: ({isClickable = false, isFocusable = false} = options);
</script>

<button
  class={`container ${size}`}
  disabled={!isClickable}
  tabindex={isFocusable ? 0 : -1}
  on:click
>
  <span class="profile-picture">
    <ProfilePicture
      {receiver}
      {services}
      options={{
        isClickable: options.isClickable,
      }}
      {size}
      {unreadMessageCount}
    />
  </span>

  <div class="content">
    {#if topLeft.length > 0 || topRight.length > 0}
      <div class="top">
        {#if topLeft.length > 0}
          <div class="left items">
            {#each topLeft as itemOptions}
              <ContentItem options={itemOptions} />
            {/each}
          </div>
        {/if}

        {#if topRight.length > 0}
          <div class="right items">
            {#each topRight as itemOptions}
              <ContentItem options={itemOptions} on:clickjoincall />
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if bottomLeft.length > 0 || bottomRight.length > 0}
      <div class="bottom">
        {#if bottomLeft.length > 0}
          <div class="left items">
            {#each bottomLeft as itemOptions}
              <ContentItem options={itemOptions} />
            {/each}
          </div>
        {/if}

        {#if bottomRight.length > 0}
          <div class="right items">
            {#each bottomRight as itemOptions}
              <ContentItem options={itemOptions} />
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</button>

<style lang="scss">
  @use 'component' as *;

  .container {
    @extend %neutral-input;

    display: flex;
    align-items: center;
    justify-content: start;
    gap: rem(8px);
    min-width: 0;
    max-width: 100%;

    &:hover:not(:disabled) {
      cursor: pointer;
    }

    .profile-picture {
      flex: none;
      // Prevent bottom space.
      line-height: 0;
    }

    .content {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
      min-width: 0;
      max-width: 100%;
      gap: rem(4px);

      @include def-var(--c-verification-dots-size, rem(6px));

      .top,
      .bottom {
        gap: rem(8px);

        .items {
          min-width: 0;
          gap: rem(4px);
        }
      }

      .top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 0;
        max-width: 100%;

        .left {
          flex: 1 1 auto;

          display: flex;
          align-items: center;
          justify-content: left;
          min-width: 0;
          max-width: 100%;

          color: var(--t-text-e1-color);
        }

        .right {
          flex: 1 0 auto;

          display: flex;
          align-items: center;
          justify-content: right;
          justify-self: end;

          color: var(--t-text-e2-color);
          font-size: rem(12px);
          line-height: rem(12px);
        }
      }

      .bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 0;
        max-width: 100%;

        color: var(--t-text-e2-color);
        font-size: rem(14px);
        line-height: rem(14px);

        .left {
          flex: 1 1 auto;

          display: flex;
          align-items: center;
          justify-content: left;
          min-width: 0;
          max-width: 100%;
        }

        .right {
          flex: 1 0 auto;

          display: flex;
          align-items: center;
          justify-content: right;
          justify-self: end;

          font-size: rem(12px);
          line-height: rem(12px);
        }
      }
    }

    &.md {
      .content {
        gap: rem(2px);

        .top {
          .left {
            font-size: rem(14px);
            line-height: rem(20px);
          }
        }
      }
    }

    &.sm {
      .content {
        .top {
          .left {
            font-size: rem(16px);
            line-height: rem(16px);
          }
        }
      }
    }
  }
</style>
