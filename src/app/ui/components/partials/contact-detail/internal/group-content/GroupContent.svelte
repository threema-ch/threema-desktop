<!--
  @component Renders details about a receiver of type `Contact`.
-->
<script lang="ts">
  import {createEventDispatcher} from 'svelte';

  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import {getGroupReceiverDataMemberCount} from '~/app/ui/components/partials/contact-detail/internal/group-content/helpers';
  import type {GroupContentProps} from '~/app/ui/components/partials/contact-detail/internal/group-content/props';
  import {groupReceiverDataToReceiverPreviewListProps} from '~/app/ui/components/partials/contact-detail/internal/group-content/transformers';
  import ProfilePicture from '~/app/ui/components/partials/profile-picture/ProfilePicture.svelte';
  import ReceiverPreviewList from '~/app/ui/components/partials/receiver-preview-list/ReceiverPreviewList.svelte';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {reactive} from '~/app/ui/utils/svelte';
  import type {u53} from '~/common/types';

  type $$Props = GroupContentProps;

  export let receiver: $$Props['receiver'];
  export let services: $$Props['services'];

  const DEFAULT_LIMIT = 4;

  let currentLimit: u53 | undefined = DEFAULT_LIMIT;

  const dispatch = createEventDispatcher<{
    clickprofilepicture: undefined;
  }>();

  function handleClickProfilePicture(): void {
    dispatch('clickprofilepicture');
  }

  function handleClickToggleExpand(): void {
    currentLimit = currentLimit === undefined ? DEFAULT_LIMIT : undefined;
  }

  function handleChangeReceiver(): void {
    currentLimit = DEFAULT_LIMIT;
  }

  $: totalMemberCount = getGroupReceiverDataMemberCount(receiver);

  $: reactive(handleChangeReceiver, [receiver]);

  // Current list items.
  $: receiverPreviewListProps = groupReceiverDataToReceiverPreviewListProps(receiver, currentLimit);
</script>

<div class="container">
  <div class="profile-picture">
    <ProfilePicture
      {receiver}
      {services}
      options={{
        isClickable: true,
      }}
      size="lg"
      on:click={handleClickProfilePicture}
    />

    <div class="details">
      <Text
        alignment={'center'}
        color="mono-high"
        family="secondary"
        size="body-large"
        text={receiver.name}
      />
    </div>
  </div>

  <div class="list">
    <div class="heading">
      {$i18n.t(
        'contacts.label--group-members-count-long',
        '{n, plural, =0 {No Group Members} =1 {1 Group Member} other {# Group Members}}',
        {n: totalMemberCount},
      )}
    </div>

    {#if receiverPreviewListProps.items.length > 0}
      <ReceiverPreviewList {...receiverPreviewListProps} {services} />
      {#if totalMemberCount > DEFAULT_LIMIT}
        <button class="expand" on:click={handleClickToggleExpand}>
          {#if currentLimit === undefined}
            <span class="icon">
              <MdIcon theme="Outlined">expand_less</MdIcon>
            </span>
            {$i18n.t('contacts.action--group-members-show-less', 'Show less')}
          {:else}
            <span class="icon">
              <MdIcon theme="Outlined">expand_more</MdIcon>
            </span>
            {$i18n.t('contacts.action--group-members-show-all', 'Show all')}
          {/if}
        </button>
      {/if}
    {:else}
      <!-- No members. -->
    {/if}
  </div>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: flex;
    flex-direction: column;

    .profile-picture {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: start;
      gap: rem(8px);
      padding: 0 rem(16px) rem(16px) rem(16px);

      .details {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: start;
      }
    }

    .list {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: start;

      .heading {
        @extend %font-small-400;

        color: var(--t-text-e2-color);
        padding: rem(10px) rem(16px);
      }

      .expand {
        @include clicktarget-button-rect;

        & {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: start;
          gap: rem(12px);

          color: var(--t-text-e2-color);
          margin: rem(8px) 0 0 0;
          padding: rem(12px) rem(16px);
        }

        .icon {
          --c-icon-font-size: #{rem(24px)};
          display: grid;
          place-items: center;
          color: var(--t-color-primary);
        }

        &:hover {
          background-color: var(--ic-list-element-background-color--hover);
        }
      }
    }
  }
</style>
