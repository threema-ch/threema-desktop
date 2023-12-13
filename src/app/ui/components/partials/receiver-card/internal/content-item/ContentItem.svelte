<!--
  @component 
  Renders content as part of a `ReceiverCard` content.
-->
<script lang="ts">
  import VerificationDots from '#3sc/components/threema/VerificationDots/VerificationDots.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {ContentItemProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/props';

  type $$Props = ContentItemProps;

  export let options: $$Props['options'];

  $: strikethrough = options.type === 'text' && options.decoration === 'strikethrough';
</script>

<span class="item" class:strikethrough>
  {#if options.type === 'text'}
    <Text
      text={options.text}
      color={options.decoration === 'semi-transparent' ? 'mono-low' : 'inherit'}
      wrap={false}
    />
  {:else if options.type === 'verification-dots'}
    <VerificationDots
      colors={options.receiver.verification.type}
      verificationLevel={options.receiver.verification.level}
    />
  {/if}
</span>

<style lang="scss">
  @use 'component' as *;

  .item {
    min-width: 0;
    text-overflow: ellipsis;
    overflow: hidden;

    &.strikethrough {
      text-decoration: line-through;
    }
  }
</style>
