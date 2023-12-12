<script lang="ts">
  import {globals} from '~/app/globals';
  import {
    type ForwardedMessageLookup,
    ROUTE_DEFINITIONS,
    type PreloadedFiles,
  } from '~/app/routing/routes';
  import type {AppServices} from '~/app/types';
  import DropZoneProvider from '~/app/ui/components/hocs/drop-zone-provider/DropZoneProvider.svelte';
  import {validateFiles} from '~/app/ui/components/hocs/drop-zone-provider/helpers';
  import type {FileDropResult} from '~/app/ui/components/hocs/drop-zone-provider/types';
  import {i18n} from '~/app/ui/i18n';
  import Welcome from '~/app/ui/main/Welcome.svelte';
  import Conversation from '~/app/ui/main/conversation/Conversation.svelte';
  import {toast} from '~/app/ui/snackbar';
  import {type SvelteNullableBinding, reactive} from '~/app/ui/utils/svelte';
  import type {DbReceiverLookup} from '~/common/db';
  import type {AnyReceiverStore} from '~/common/model';
  import type {Remote} from '~/common/utils/endpoint';
  import type {
    ConversationViewModel,
    IConversationViewModelController,
    SendMessageEventDetail,
  } from '~/common/viewmodel/conversation';

  const log = globals.unwrap().uiLogging.logger('ui.component.conversation-wrapper');

  export let services: AppServices;

  // Unpack services and backend
  const {router, backend} = services;

  // Get conversation lookup info
  let receiverLookup: DbReceiverLookup;
  let forwardedMessageLookup: ForwardedMessageLookup | undefined;
  let preloadedFiles: PreloadedFiles | undefined;

  function handleDropFiles(event: CustomEvent<FileDropResult>): void {
    conversationElement?.handleFileDrop(event.detail);
  }

  $: if ($router.main.id === 'conversation') {
    const route = $router.main;
    receiverLookup = route.params.receiverLookup;
    forwardedMessageLookup = route.params.forwardedMessage;
    preloadedFiles = route.params.preloadedFiles;
  }

  $: reactive(() => {
    if (preloadedFiles !== undefined && preloadedFiles.length !== 0) {
      const fileArray: File[] = [];
      for (const f of preloadedFiles) {
        const blob = new Blob([f.bytes]);
        fileArray.push(new File([blob], f.fileName));
      }
      validateFiles(fileArray)
        .then((fileResult) => {
          conversationElement?.handleFileDrop(fileResult);
        })
        .catch((error) => log.error(`An error occurred when validating files: ${error}`));
    }
  }, [$router]);

  let conversationViewModel: Remote<ConversationViewModel> | undefined;
  let receiver: Remote<AnyReceiverStore> | undefined;
  let viewModelController: Remote<IConversationViewModelController> | undefined;

  // Look up conversation
  $: {
    void backend.viewModel.conversation(receiverLookup).then((conversationViewModelParam) => {
      if (conversationViewModelParam === undefined) {
        // Show toast and navigate to welcome page
        toast.addSimpleFailure(
          i18n.get().t('messaging.error--conversation-not-found', 'Conversation not found'),
        );
        router.replaceMain(ROUTE_DEFINITIONS.main.welcome.withoutParams());
        return;
      }

      conversationViewModel = conversationViewModelParam;
      receiver = conversationViewModelParam.receiver;
      viewModelController = conversationViewModelParam.viewModelController;
    });
  }

  let conversationElement: SvelteNullableBinding<Conversation | undefined>;

  async function sendMessage(event: CustomEvent<SendMessageEventDetail>): Promise<void> {
    await viewModelController?.sendMessage(event.detail);
  }

  let mediaMessageDialogVisible = false;
</script>

{#if conversationViewModel !== undefined && receiver !== undefined && $receiver !== undefined}
  <DropZoneProvider
    overlay={{
      message: $i18n.t('messaging.hint--drop-files-to-send', 'Drop files here to send'),
    }}
    on:dropfiles={handleDropFiles}
  >
    <Conversation
      bind:this={conversationElement}
      bind:mediaMessageDialogVisible
      {conversationViewModel}
      {receiverLookup}
      {forwardedMessageLookup}
      {services}
      on:sendMessage={sendMessage}
    />
  </DropZoneProvider>
{:else}
  <Welcome />
{/if}
