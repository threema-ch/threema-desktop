<script lang="ts">
  import Button from '#3sc/components/blocks/Button/Button.svelte';
  import MdIcon from '#3sc/components/blocks/Icon/MdIcon.svelte';
  import type {AppServices} from '~/app/types';
  import {i18n, type Locale, LOCALES} from '~/app/ui/i18n';
  import {type Theme, THEMES} from '~/common/dom/ui/theme';
  import {ReceiverType} from '~/common/enum';
  import type {
    AnyMessage,
    ContactView,
    ConversationView,
    DistributionListView,
    GroupView,
  } from '~/common/model';
  import {unreachable, unwrap} from '~/common/utils/assert';

  export let services: AppServices;

  // Unpack services
  const {backend, storage} = services;

  // Unpack stores
  const {theme, locale} = storage;

  let notificationPermission: NotificationPermission = Notification.permission;

  async function requestNotificationPermissionAndNotify(): Promise<void> {
    notificationPermission = await Notification.requestPermission();
    // eslint-disable-next-line no-new
    new Notification('Test notification');
  }

  /**
   * Unlink and delete the device data and restart the application.
   */
  async function resetProfile(): Promise<void> {
    // First, unlink from mediator
    await services.backend.selfKickFromMediator();

    // Then, request deletion of profile directory and app restart
    const ipc = window.app;
    ipc.deleteProfileAndRestartApp();
  }

  // Database inspection mode
  interface Data {
    contacts: ContactView[];
    groups: GroupView[];
    conversations: [
      conversation: ConversationView,
      receiver:
        | {type: 'contact'; view: ContactView}
        | {type: 'group'; view: GroupView}
        | {type: 'distributionList'; view: DistributionListView},
      messages: AnyMessage<'view'>[],
    ][];
  }
  /**
   * Asynchronously load all data from database and return it as {@link Data}.
   */
  async function loadData(): Promise<Data> {
    const data: Data = {
      contacts: [],
      groups: [],
      conversations: [],
    };
    const contactMap = (await backend.model.contacts.getAll()).get();
    for (const contact of contactMap.values()) {
      data.contacts.push(contact.get().view);
    }
    const groupMap = (await backend.model.groups.getAll()).get();
    for (const group of groupMap.values()) {
      data.groups.push(group.get().view);
    }
    const conversationMap = (await backend.model.conversations.getAll()).get();
    for (const conversation of conversationMap.values()) {
      const receiverStore = await conversation.get().controller.receiver();
      let receiver;
      switch (receiverStore.type) {
        case ReceiverType.CONTACT:
          receiver = {type: 'contact', view: receiverStore.get().view} as const;
          break;
        case ReceiverType.GROUP:
          receiver = {type: 'group', view: receiverStore.get().view} as const;
          break;
        case ReceiverType.DISTRIBUTION_LIST:
          receiver = {type: 'distributionList', view: receiverStore.get().view} as const;
          break;
        default:
          unreachable(receiverStore);
      }
      const messageMap = (await conversation.get().controller.getAllMessages()).get();
      const messages: AnyMessage<'view'>[] = [];
      for (const message of messageMap.values()) {
        messages.push(message.get().view);
      }
      data.conversations.push([conversation.get().view, receiver, messages]);
    }
    return data;
  }
  /**
   * Dump data to the debug console.
   */
  function dumpData(): void {
    /* eslint-disable no-console */
    void loadData().then((data) => {
      console.log(`%cContacts (${data.contacts.length})`, 'font-weight: bold');
      for (const contact of data.contacts) {
        console.log(`Contact ${contact.identity}`, contact);
      }

      console.log(`%cGroups (${data.groups.length})`, 'font-weight: bold');
      for (const group of data.groups) {
        console.log(`Group ${group.displayName}`, group);
      }

      console.log(`%cConversations (${data.conversations.length})`, 'font-weight: bold');
      for (const [conversation, receiver, messages] of data.conversations) {
        switch (receiver.type) {
          case 'contact':
            console.log(`Conversation with ${receiver.view.identity}`, conversation);
            break;
          case 'group':
            console.log(`Conversation with ${receiver.view.displayName}`, conversation);
            break;
          case 'distributionList':
            // TODO(DESK-236)
            break;
          default:
            unreachable(receiver);
        }
        console.log('  Receiver:', receiver);
        console.log('  Messages:', messages);
      }
    });
    /* eslint-enable no-console */
  }

  const themes: Theme[] = [...THEMES];

  function cycleTheme(): void {
    $theme = themes.shift() ?? THEMES[0];
    themes.push($theme);
  }

  // Cycle theme once if the current theme is the first in the list to avoid a NoOp the first time
  // we click on the "Cycle Theme" button
  if ($theme === themes[0]) {
    cycleTheme();
  }

  const locales: Locale[] = [...LOCALES];

  function cycleLocale(): void {
    $locale = locales.shift() ?? unwrap(LOCALES[0]);
    locales.push($locale);
  }

  // Cycle locale once if the current locale is the first in the list to avoid a NoOp the first time
  // we click on the "Cycle Locale" button
  if ($locale === locales[0]) {
    cycleLocale();
  }
</script>

<template>
  <section class="storage">
    <h3>Local Storage</h3>

    <Button flavor="filled" on:click={cycleTheme}>
      <span class="icon-and-text"
        ><MdIcon theme="Filled">invert_colors</MdIcon>
        Cycle Theme [{$theme}]</span
      >
    </Button>

    <Button flavor="filled" on:click={cycleLocale}>
      <span class="icon-and-text"
        ><MdIcon theme="Filled">language</MdIcon>
        Cycle Locale [{$locale}]</span
      >
    </Button>

    <h3>Permissions</h3>

    <Button
      flavor="filled"
      on:click={() => {
        void requestNotificationPermissionAndNotify();
      }}
    >
      <span class="icon-and-text"
        ><MdIcon theme="Filled">notifications</MdIcon>
        Notification Permission [{notificationPermission}]</span
      >
    </Button>

    <h3>User Profile</h3>

    <Button flavor="filled" on:click={resetProfile}>
      <span class="icon-and-text"
        ><MdIcon theme="Filled">restart_alt</MdIcon>
        Delete Data and Unlink{#if import.meta.env.DEBUG}¹{/if}
      </span>
    </Button>
    <p>
      <em>
        This will delete the profile data on this device, unlink the device from your Threema ID and
        restart.
      </em>
      {#if import.meta.env.DEBUG}
        <br />
        <em>
          ¹ Due to the way the dev server is started, the button above will not be able to properly
          restart the app in dev mode.
        </em>
      {/if}
    </p>

    <h3>Database</h3>

    <Button
      flavor="filled"
      on:click={() => {
        void backend.debug.generateFakeContactConversation();
      }}
    >
      <span class="icon-and-text"
        ><MdIcon theme="Filled">auto_fix_normal</MdIcon>
        Generate fake contact conversation</span
      >
    </Button>

    <Button
      flavor="filled"
      on:click={() => {
        void backend.debug.generateFakeGroupConversation();
      }}
    >
      <span class="icon-and-text"
        ><MdIcon theme="Filled">auto_fix_normal</MdIcon>
        Generate fake group conversation</span
      >
    </Button>

    <Button flavor="filled" on:click={dumpData}>
      <span class="icon-and-text"
        ><MdIcon theme="Filled">manage_search</MdIcon>
        Dump data to debug console</span
      >
    </Button>

    <h3>Screenshots</h3>

    <Button
      flavor="filled"
      on:click={() => {
        void backend.debug.generateScreenshotData($i18n.locale);
      }}
    >
      <span class="icon-and-text"
        ><MdIcon theme="Filled">auto_fix_normal</MdIcon>
        Generate screenshot data</span
      >
    </Button>
  </section>
</template>

<style lang="scss">
  @use 'component' as *;

  .storage {
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
