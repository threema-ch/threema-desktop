<script lang="ts">
  import {Button} from '@threema/ui';

  const brandings = ['consumer', 'work', 'onprem'] as const;
  type Branding = (typeof brandings)[number];

  let currentBranding = $state<Branding>(
    (document.documentElement.dataset.branding as Branding | undefined) ?? 'consumer',
  );

  function setBranding(branding: Branding): void {
    currentBranding = branding;
    document.documentElement.dataset.branding = branding;
    localStorage.setItem('branding', branding);
  }
</script>

<main class="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
  <h1 class="text-3xl font-bold text-primary-700">Threema Conferencing</h1>

  <p class="text-neutral-600 max-w-md text-center">Welcome to Threema Conferencing.</p>

  <div class="flex flex-wrap justify-center gap-4">
    <Button log={console} variant="primary">Join Call</Button>
    <Button log={console} variant="secondary">Learn More</Button>
  </div>

  <label>
    Branding:
    <select
      value={currentBranding}
      onchange={(event) => setBranding(event.currentTarget.value as Branding)}
    >
      {#each brandings as branding (branding)}
        <option value={branding}>{branding}</option>
      {/each}
    </select>
  </label>

  <p class="text-neutral-400 text-sm">
    The buttons above use <code class="font-mono">@threema/ui</code>, themed via
    <code class="font-mono">@threema/branding</code>.
  </p>
</main>
