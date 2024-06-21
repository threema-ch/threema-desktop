<script lang="ts">
  import type {AppServices} from '~/app/types';
  import {i18n} from '~/app/ui/i18n';
  import Button from '~/app/ui/svelte-components/blocks/Button/Button.svelte';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {resetProfile} from '~/app/ui/utils/profile';
  import {ReceiverType} from '~/common/enum';
  import type {
    AnyMessage,
    ContactView,
    ConversationView,
    DistributionListView,
    GroupView,
  } from '~/common/model';
  import type {AnyStatusMessageView} from '~/common/model/types/status';
  import {assertUnreachable, unreachable} from '~/common/utils/assert';

  export let services: AppServices;

  // Unpack services
  const {backend} = services;

  let notificationPermission: NotificationPermission = Notification.permission;

  async function requestNotificationPermissionAndNotify(): Promise<void> {
    notificationPermission = await Notification.requestPermission();
    // eslint-disable-next-line no-new
    new Notification('Test notification');
  }

  /**
   * Unlink and delete the device data and restart the application.
   */
  async function resetAndUnlink(): Promise<void> {
    await resetProfile(services);
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
      messages: (AnyMessage<'view'> | AnyStatusMessageView)[],
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
      const messages: (AnyMessage<'view'> | AnyStatusMessageView)[] = [];
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
    loadData()
      .then((data) => {
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
      })
      .catch(assertUnreachable);
    /* eslint-enable no-console */
  }
</script>

<template>
  <section class="storage">
    <h3>Permissions</h3>

    <Button
      flavor="filled"
      on:click={() => {
        requestNotificationPermissionAndNotify().catch(assertUnreachable);
      }}
    >
      <span class="icon-and-text"
        ><MdIcon theme="Filled">notifications</MdIcon>
        Notification Permission [{notificationPermission}]</span
      >
    </Button>

    <h3>User Profile</h3>

    <Button flavor="filled" on:click={resetAndUnlink}>
      <span class="icon-and-text"
        ><MdIcon theme="Filled">restart_alt</MdIcon>
        {#if import.meta.env.DEBUG}Unlink and Exit{:else}Unlink and Relink{/if}
      </span>
    </Button>
    <p>
      {#if import.meta.env.DEBUG}
        <em> This will unlink the device from your device group and close the application.</em>
      {:else}
        <em>
          This will unlink the device from your device group, delete the profile data on this device
          and restart. (Note that this will not work properly when not started through the launcher
          binary.)
        </em>
      {/if}
    </p>

    <h3>Database</h3>

    <Button
      flavor="filled"
      on:click={() => {
        backend.debug.generateFakeContactConversation().catch(assertUnreachable);
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
        backend.debug.generateFakeGroupConversation().catch(assertUnreachable);
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
        backend.debug.importScreenshotData($i18n.locale).catch(assertUnreachable);
      }}
    >
      <span class="icon-and-text"
        ><MdIcon theme="Filled">auto_fix_normal</MdIcon>
        Import screenshot data</span
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
