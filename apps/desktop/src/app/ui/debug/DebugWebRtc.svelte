<script lang="ts">
  import type {AppServicesForSvelte} from '~/app/types';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';

  interface Props {
    services: AppServicesForSvelte;
  }

  const {services}: Props = $props();

  // Unpack services.
  const {electron} = services;
</script>

<section class="webrtc">
  <h3>WebRTC Internals</h3>

  <Button flavor="filled" onclick={() => electron.openWebRtcInternals()}>
    <span class="icon-and-text">
      <MdIcon theme="Filled">monitor_heart</MdIcon>
      Open WebRTC Internals
    </span>
  </Button>
  <p>
    <em>
      Open a window showing <code>chrome://webrtc-internals</code>, which provides detailed
      information about ongoing WebRTC sessions.
    </em>
  </p>
</section>

<style lang="scss">
  @use 'component' as *;

  .webrtc {
    padding: rem(8px);
    display: grid;
    gap: rem(8px);
    place-items: center;
    grid-auto-flow: row;
  }

  .icon-and-text {
    display: flex;
    gap: rem(4px);
    place-items: center;
  }
</style>
