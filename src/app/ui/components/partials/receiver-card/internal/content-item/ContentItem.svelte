<!--
  @component 
  Renders content as part of a `ReceiverCard` content.
-->
<script lang="ts">
  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import {getTextContentItemOptionsFromReceiverNameContentItemOptions} from '~/app/ui/components/partials/receiver-card/internal/content-item/helpers';
  import Charms from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/charms/Charms.svelte';
  import Indicator from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/indicator/Indicator.svelte';
  import Tags from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/tags/Tags.svelte';
  import Timestamp from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/timestamp/Timestamp.svelte';
  import type {ContentItemProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/props';
  import {unreachable} from '~/common/utils/assert';
  import {hasProperty} from '~/common/utils/object';

  type $$Props = ContentItemProps;

  export let options: $$Props['options'];
</script>

<span class="item">
  {#if options.type === 'charms'}
    <Charms
      isBlocked={options.isBlocked}
      isPinned={options.isPinned}
      isPrivate={options.isPrivate}
      notificationPolicy={options.notificationPolicy}
    />
  {:else if options.type === 'receiver-name'}
    {@const textContentItemOptions = getTextContentItemOptionsFromReceiverNameContentItemOptions(
      options.receiver,
      options.highlights,
    )}

    <span
      class="nowrap"
      class:semitransparent={textContentItemOptions.decoration === 'semi-transparent'}
      class:strikethrough={textContentItemOptions.decoration === 'strikethrough'}
    >
      {#if hasProperty(textContentItemOptions.text, 'raw')}
        {textContentItemOptions.text.raw}
      {:else}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html textContentItemOptions.text.html}
      {/if}
    </span>
  {:else if options.type === 'relative-timestamp'}
    <Timestamp date={options.date} format={options.format} services={options.services} />
  {:else if options.type === 'status-icon'}
    <Indicator
      conversation={options.conversation}
      reactions={options.reactions}
      status={options.status}
      options={options.options}
    />
  {:else if options.type === 'tags'}
    <Tags
      isArchived={options.isArchived}
      isCreator={options.isCreator}
      isInactive={options.isInactive}
      isInvalid={options.isInvalid}
    />
  {:else if options.type === 'text'}
    <span
      class="nowrap"
      class:semitransparent={options.decoration === 'semi-transparent'}
      class:strikethrough={options.decoration === 'strikethrough'}
    >
      {#if hasProperty(options.text, 'raw')}
        {options.text.raw}
      {:else}
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html options.text.html}
      {/if}
    </span>
  {:else if options.type === 'verification-dots'}
    <VerificationDots
      colors={options.receiver.verification.type}
      verificationLevel={options.receiver.verification.level}
    />
  {:else}
    {unreachable(options)}
  {/if}
</span>

<style lang="scss">
  @use 'component' as *;

  .item {
    min-width: 0;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;

    .nowrap {
      overflow-wrap: normal;
      white-space: nowrap;
    }

    .semitransparent {
      color: var(--t-text-e2-color);
    }

    .strikethrough {
      text-decoration: line-through;
    }
  }
</style>
