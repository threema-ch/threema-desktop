<!--
  @component Renders a mention.
-->
<script lang="ts">
  import type {MentionProps} from '~/app/ui/components/partials/mention/props';
  import {i18n} from '~/app/ui/i18n';
  import {unreachable} from '~/common/utils/assert';

  type $$Props = MentionProps;

  export let mention: $$Props['mention'];

  function getName(currentMention: $$Props['mention']): string {
    switch (currentMention.type) {
      case 'self':
        return $i18n.t('messaging.label--mention-me');

      case 'removed-contact':
        return currentMention.identity;

      case 'everyone':
        return $i18n.t('messaging.label--mention-all');

      case 'contact':
        return currentMention.name;

      default:
        return unreachable(currentMention);
    }
  }
</script>

<span class="mention" data-type={mention.type} data-name={`@${getName(mention)}`}>
  <span class="identity" aria-hidden="true">{`@[${mention.identity}]`}</span>
</span>

<style lang="scss">
  @use 'component' as *;

  .mention {
    padding: 0 rem(2px);

    user-select: all;
    // Ensure background text doesn't take any space.
    letter-spacing: -1em;
    text-wrap: nowrap;

    &::before {
      @extend %mention;

      content: attr(data-name);
      letter-spacing: 0;
    }

    &[data-type='everyone'] {
      &::before {
        @extend %mention-all;
      }
    }

    .identity {
      opacity: 0;
    }
  }
</style>
