<script lang="ts">
  import Bubble from '~/app/ui/components/molecules/message/internal/bubble/Bubble.svelte';
</script>

<Bubble direction="inbound">
  <div class="dot dot-one"></div>
  <div class="dot dot-two"></div>
  <div class="dot dot-three"></div>
</Bubble>

<style lang="scss">
  @use 'component' as *;

  .dot {
    display: inline-block;
    width: rem(8px);
    height: rem(8px);
    border-radius: rem(4px);
    background-color: var(--t-text-e1-color);
  }

  .dot-one {
    animation: dot-flashing 0.5s infinite linear alternate;
    animation-delay: 0s;
  }

  .dot-two {
    animation: dot-flashing 0.5s infinite linear alternate;
    animation-delay: 0.25s;
  }

  .dot-three {
    animation: dot-flashing 0.5s infinite linear alternate;
    animation-delay: 0.5s;
  }

  @keyframes dot-flashing {
    0% {
      background-color: var(--t-text-e1-color);
    }
    50%,
    100% {
      opacity: 0.1;
    }
  }
</style>
