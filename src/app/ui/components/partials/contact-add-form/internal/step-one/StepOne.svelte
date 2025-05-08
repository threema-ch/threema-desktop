<script lang="ts">
  import {onMount} from 'svelte';

  import type {StepOneProps} from '~/app/ui/components/partials/contact-add-form/internal/step-one/props';
  import TopBar from '~/app/ui/components/partials/contact-add-form/internal/top-bar/TopBar.svelte';
  import HiddenSubmit from '~/app/ui/generic/form/HiddenSubmit.svelte';
  import IconText from '~/app/ui/generic/menu/item/IconText.svelte';
  import {i18n} from '~/app/ui/i18n';
  import WizardButton from '~/app/ui/svelte-components/blocks/Button/WizardButton.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import Text from '~/app/ui/svelte-components/blocks/Input/Text.svelte';
  import {isIdentityString} from '~/common/network/types';
  import {assertUnreachable} from '~/common/utils/assert';

  type $$Props = StepOneProps;

  export let identity: $$Props['identity'];
  export let identityFieldError: $$Props['identityFieldError'];
  export let handleNextClicked: $$Props['handleNextClicked'];

  let threemaIdTextField: Text;

  onMount(() => {
    threemaIdTextField.focus();
  });
</script>

<form
  class="container"
  on:submit|preventDefault={() => {
    handleNextClicked().catch(assertUnreachable);
  }}
>
  <HiddenSubmit />
  <div class="bar">
    <TopBar on:back on:cancel />
  </div>
  <div class="content">
    <span class="note-enter"
      >{$i18n.t(
        'contacts.prose--add-contact-instructions',
        'Please enter the {shortAppName} ID of the contact you would like to add:',
        {
          shortAppName: import.meta.env.SHORT_APP_NAME,
        },
      )}
    </span>
    <div class="threema-id">
      <Text
        bind:this={threemaIdTextField}
        bind:value={identity}
        error={identityFieldError}
        label={$i18n.t('contacts.label--threema-id', '{shortAppName} ID', {
          shortAppName: import.meta.env.SHORT_APP_NAME,
        })}
        spellcheck={false}
      />
    </div>
    <!-- <div
    class="qr-scan"
    on:click={() => {
      // eslint-disable-next-line no-alert
      alert('Not yet implemented (DESK-387)');
    }}
  >
    <IconText>
      <div slot="icon" class="icon wip">
        <MdIcon theme="Filled">qr_code_scanner</MdIcon>
      </div>
      <div slot="text" class="wip">Scan Threema ID</div>
    </IconText>
  </div> -->
    {#if import.meta.env.BUILD_VARIANT === 'work' || import.meta.env.BUILD_VARIANT === 'custom'}
      <hr />
      <span class="note-directory">
        {$i18n.t(
          'contacts.prose--add-contact-instructions-work-directory',
          'Or search a contact in corporate directory and add it to your personal contact list:',
        )}
      </span>
      <button
        class="add-contact"
        on:click={() => {
          // eslint-disable-next-line no-alert
          alert('Not yet implemented (DESK-388)');
        }}
      >
        <IconText>
          <div slot="icon" class="icon">
            <MdIcon theme="Filled">add</MdIcon>
          </div>
          <div slot="text">
            {$i18n.t(
              'contacts.action--add-contact-from-work-directory',
              'Add Contact from Directory',
            )}
          </div>
        </IconText>
      </button>
    {/if}
  </div>

  <div class="next">
    <WizardButton disabled={!isIdentityString(identity)} on:click={handleNextClicked}>
      {$i18n.t('contacts.action--add-contact-next', 'Next')}
    </WizardButton>
  </div>
</form>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    background-color: var(--t-nav-background-color);
    grid-template:
      'bar' rem(64px)
      'content' auto
      '.' 1fr
      'next' rem(64px);
    align-content: start;
    overflow: hidden;
    height: 100%;

    .bar {
      grid-area: bar;

      padding: rem(12px) rem(8px);
    }

    .content {
      grid-area: content;

      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: start;
      gap: rem(8px);

      .note-enter,
      .note-directory {
        padding: rem(4px) rem(16px) 0;
      }

      .add-contact {
        @extend %neutral-input;
      }

      .threema-id,
      .add-contact {
        padding: 0 rem(16px);
      }

      .icon {
        display: grid;
        place-items: center;
        color: var(--t-color-primary);
      }

      span {
        color: var(--t-text-e2-color);
      }

      hr {
        border: none;
        border-top: rem(1px) solid rgba(#000000, 12%);
        overflow: visible;
        text-align: center;
        margin: rem(8px) rem(8px);
        width: calc(100% - rem(32px));
      }
    }

    .next {
      display: grid;
      grid-area: next;
      background-color: var(--t-color-primary);
      align-self: stretch;
      grid-template: 'text' / auto;
      justify-items: end;
      align-items: center;
      padding: 0 rem(8px);
    }
  }
</style>
