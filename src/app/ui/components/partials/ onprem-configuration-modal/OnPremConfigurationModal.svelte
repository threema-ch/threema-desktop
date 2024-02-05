<script lang="ts">
  import {onDestroy, onMount} from 'svelte';

  import {globals} from '~/app/globals';
  import SubstitutableText from '~/app/ui/SubstitutableText.svelte';
  import Input from '~/app/ui/components/atoms/input/Input.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import type {OnPremConfigurationModalProps} from '~/app/ui/components/partials/onprem-configuration-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import Step from '~/app/ui/linking/Step.svelte';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import Password from '~/app/ui/svelte-components/blocks/Input/Password.svelte';
  import {assertUnreachable} from '~/common/utils/assert';
  import {u8aToBase64} from '~/common/utils/base64';
  import {UTF8} from '~/common/utils/codec';

  const log = globals.unwrap().uiLogging.logger('ui.component.onprem.oppf');

  type $$Props = OnPremConfigurationModalProps;
  export let oppfConfig: $$Props['oppfConfig'];

  let oppfUrl = 'https://';
  let password = '';
  let username = '';

  let submitError: string | undefined = undefined;

  async function handleClickConfirm(): Promise<void> {
    const headers = new Headers();
    headers.append('Authorization', `Basic ${u8aToBase64(UTF8.encode(`${username}:${password}`))}`);

    try {
      const res = await fetch(oppfUrl, {
        headers,
        method: 'HEAD',
      });
      if (res.status === 200) {
        oppfConfig.resolve({
          password,
          username,
          oppfUrl,
        });
      } else if (response.status === 401) {
        submitError = $i18n.t(
          'dialog--linking-oppf.error--credentials-error',
          'The provided credentials are incorrect. Please check that the combination of URL and work credentials is correct or contact your administrator.',
        );
      } else {
        log.warn('Could not fetch Oppf file with status code ', res.status);
        submitError = $i18n.t(
          'dialog--linking-oppf.error--fetch-error',
          'The provided URL is invalid. Please check that the combination of URL and work credentials is correct or contact your administrator.',
        );
      }
    } catch (error) {
      log.error(error);
      submitError = $i18n.t(
        'dialog--linking-oppf.error--fetch-error-connection',
        'The provided URL is not accessible. Please check your network connection or contact your administrator.',
      );
    }
  }

  function handleKeydownEvent(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      void handleClickConfirm().catch(assertUnreachable);
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydownEvent);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydownEvent);
  });
</script>

<Step>
  <header>
    <h1>{$i18n.t('dialog--linking-oppf.label--oppf-file', 'Threema OnPrem')}</h1>
    <p class="intro">
      <Text
        text={$i18n.t(
          'dialog--linking-oppf.prose--enter-config',
          'Threema OnPrem is the self-hosted messenger for companies. Please enter the credentials provided by your company',
        )}
      ></Text>
    </p>
  </header>
  <div class="body">
    <Input
      id="work_usernam"
      autofocus
      label={$i18n.t('dialog--linking-oppf.label--username', 'Username')}
      bind:value={username}
    ></Input>
    <Password
      label={$i18n.t('dialog--linking-oppf.label--password', 'Password')}
      bind:value={password}
    ></Password>
    <Input
      id="oppf_url"
      label={$i18n.t('dialog--linking-oppf.label--url', 'URL')}
      bind:value={oppfUrl}
    ></Input>
    {#if submitError !== undefined}
      <div class="error"><Text text={submitError} color="inherit" family="secondary"></Text></div>
    {/if}
    <div class="info">
      <Text
        text={$i18n.t(
          'dialog--linking-oppf.prose--forget-credentials',
          'Forgot your credentials? Please contact your Threema OnPrem administrator.',
        )}
      ></Text>
    </div>
    <div class="info">
      <SubstitutableText
        text={$i18n.t(
          'dialog--linking-oppf.prose--private-user',
          'If you are a private user, please visit <1 /> to download Threema.',
        )}
      >
        <a
          slot="1"
          href={import.meta.env.URLS.downloadAndInfoForOtherVariant.full}
          target="_blank"
          rel="noreferrer noopener">{import.meta.env.URLS.downloadAndInfoForOtherVariant.short}</a
        >
      </SubstitutableText>
    </div>
  </div>
  <div class="footer">
    <Button flavor="filled" on:click={handleClickConfirm}
      >{$i18n.t('dialog--linking-oppf.action--confirm', 'Next')}</Button
    >
  </div>
</Step>

<style lang="scss">
  @use 'component' as *;

  h1,
  h2,
  p {
    padding: 0;
    margin: 0;
  }

  header {
    display: grid;
    gap: rem(8px);
    margin-bottom: rem(24px);

    h1 {
      @extend %font-large-400;
    }

    .intro {
      color: var(--t-text-e2-color);

      a {
        text-decoration: underline;
        color: inherit;
      }
    }
  }

  .body {
    color: var(--t-text-e2-color);
    gap: rem(8px) a {
      text-decoration: underline;
      color: inherit;
    }
    .info {
      margin-top: rem(12px);
    }
    .error {
      margin-top: rem(12px);
      color: var(--c-input-text-error-color);
    }
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: end;
    gap: rem(8px);
    padding: rem(16px);
  }
</style>
