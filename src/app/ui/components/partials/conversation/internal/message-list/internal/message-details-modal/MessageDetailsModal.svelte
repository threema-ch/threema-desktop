<!--
  @component
  Renders a modal with details about a message.
-->
<script lang="ts">
  import Prose from '~/app/ui/components/atoms/prose/Prose.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import type {MessageDetailsModalProps} from '~/app/ui/components/partials/conversation/internal/message-list/internal/message-details-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import MdIcon from '~/app/ui/svelte-components/blocks/Icon/MdIcon.svelte';
  import {formatDateLocalized} from '~/app/ui/utils/timestamp';
  import {isMessageId, isStatusMessageId} from '~/common/network/types';
  import type {u53} from '~/common/types';
  import {unreachable} from '~/common/utils/assert';
  import {u64ToHexLe} from '~/common/utils/number';

  type $$Props = MessageDetailsModalProps;

  export let conversation: $$Props['conversation'];
  export let direction: $$Props['direction'] = undefined;
  export let file: $$Props['file'] = undefined;
  export let id: $$Props['id'] = undefined;
  export let reactions: $$Props['reactions'];
  export let history: $$Props['history'];
  export let services: $$Props['services'];
  export let status: $$Props['status'];
  export let statusMessageType: $$Props['statusMessageType'] = undefined;

  const {
    settings: {appearance},
  } = services;

  let acknowledgeReactions: string[] = [];
  let declineReactions: string[] = [];
  let outboundReaction: $$Props['reactions'][u53]['type'] | undefined = undefined;

  function handleUpdateReactions(currentReactions: $$Props['reactions']): void {
    acknowledgeReactions.length = 0;
    declineReactions.length = 0;

    for (const reaction of currentReactions) {
      if (reaction.direction === 'outbound') {
        outboundReaction = reaction.type;
      }

      switch (reaction.type) {
        case 'acknowledged':
          acknowledgeReactions.push(reaction.sender.name);
          break;

        case 'declined':
          declineReactions.push(reaction.sender.name);

          break;

        default:
          unreachable(reaction.type);
      }
    }

    acknowledgeReactions = acknowledgeReactions;
    declineReactions = declineReactions;
  }

  let sortedHistory: $$Props['history'] = [];
  $: sortedHistory = [...history].sort((a, b) => (a.at < b.at ? 1 : -1));

  $: use24hTime = $appearance.view.use24hTime;
  $: handleUpdateReactions(reactions);
</script>

<Modal
  wrapper={{
    type: 'card',
    actions: [
      {
        iconName: 'close',
        onClick: 'close',
      },
    ],
    maxWidth: 460,
    title: $i18n.t('dialog--message-details.label--title', 'Message Details'),
  }}
  on:close
>
  <div class="content">
    <KeyValueList>
      <KeyValueList.Section>
        <KeyValueList.Item key={$i18n.t('dialog--message-details.label--created-date', 'Created')}>
          <Text
            text={formatDateLocalized(status.created.at, $i18n, 'extended', use24hTime)}
            selectable
          />
        </KeyValueList.Item>
        {#if status.received !== undefined}
          <KeyValueList.Item
            key={$i18n.t('dialog--message-details.label--received-date', 'Received')}
          >
            <Text
              text={formatDateLocalized(status.received.at, $i18n, 'extended', use24hTime)}
              selectable
            />
          </KeyValueList.Item>
        {/if}
        {#if status.sent !== undefined}
          <KeyValueList.Item key={$i18n.t('dialog--message-details.label--sent-date', 'Sent')}>
            <Text
              text={formatDateLocalized(status.sent.at, $i18n, 'extended', use24hTime)}
              selectable
            />
          </KeyValueList.Item>
        {/if}
        {#if status.delivered !== undefined}
          <KeyValueList.Item
            key={$i18n.t('dialog--message-details.label--delivered-date', 'Delivered')}
          >
            <Text
              text={formatDateLocalized(status.delivered.at, $i18n, 'extended', use24hTime)}
              selectable
            />
          </KeyValueList.Item>
        {/if}
        {#if status.read !== undefined}
          <KeyValueList.Item key={$i18n.t('dialog--message-details.label--read-date', 'Read')}>
            <Text
              text={formatDateLocalized(status.read.at, $i18n, 'extended', use24hTime)}
              selectable
            />
          </KeyValueList.Item>
        {/if}
        {#if status.edited !== undefined}
          <KeyValueList.Item
            key={$i18n.t('dialog--message-details.label--last-edited-date', 'Last Edited')}
          >
            <Text
              text={formatDateLocalized(status.edited.at, $i18n, 'extended', use24hTime)}
              selectable
            />
          </KeyValueList.Item>
        {/if}
        {#if status.deleted !== undefined}
          <KeyValueList.Item
            key={$i18n.t('dialog--message-details.label--deleted-date', 'Deleted')}
          >
            <Text
              text={formatDateLocalized(status.deleted.at, $i18n, 'extended', use24hTime)}
              selectable
            />
          </KeyValueList.Item>
        {/if}
      </KeyValueList.Section>
      {#if isMessageId(id)}
        <KeyValueList.Section>
          <KeyValueList.Item
            key={$i18n.t('dialog--message-details.label--message-id', 'Message ID')}
          >
            <Text text={u64ToHexLe(id)} selectable />
          </KeyValueList.Item>
        </KeyValueList.Section>
      {/if}
      {#if file !== undefined}
        <KeyValueList.Section>
          <KeyValueList.Item key={$i18n.t('dialog--message-details.label--file-name', 'File Name')}>
            <Text text={file.name.raw ?? file.name.default} selectable />
          </KeyValueList.Item>

          <KeyValueList.Item key={$i18n.t('dialog--message-details.label--file-size', 'File Size')}>
            <Text text={`${(file.sizeInBytes / 1000).toFixed(0)} kB`} selectable />
          </KeyValueList.Item>

          <KeyValueList.Item
            key={$i18n.t('dialog--message-details.label--media-type', 'Media Type')}
          >
            <Text text={file.mediaType} selectable />
          </KeyValueList.Item>
        </KeyValueList.Section>
      {/if}
      {#if reactions.length > 0}
        <KeyValueList.Section>
          <KeyValueList.Item key={$i18n.t('dialog--message-details.label--reactions', 'Reactions')}>
            {#if conversation.receiver.type === 'contact'}
              {@const reaction = reactions[0]}
              {#if reaction !== undefined}
                <div class="reaction">
                  <div class={`thumb ${reaction.type}`}>
                    <MdIcon theme="Filled"
                      >{reaction.type === 'acknowledged' ? 'thumb_up' : 'thumb_down'}</MdIcon
                    >
                  </div>
                  <div class="date">
                    <Text text={formatDateLocalized(reaction.at, $i18n, 'extended', use24hTime)} />
                  </div>
                </div>
              {/if}
            {:else if acknowledgeReactions.length !== 0}
              <div class="reaction">
                <div class={'thumb acknowledged'}>
                  <MdIcon theme={outboundReaction === 'acknowledged' ? 'Filled' : 'Outlined'}
                    >{'thumb_up'}</MdIcon
                  >
                </div>
                <div class="date">
                  <Text text={acknowledgeReactions.join(', ')} selectable />
                </div>
              </div>
            {/if}
            {#if declineReactions.length !== 0}
              <div class="reaction">
                <div class={'thumb declined'}>
                  <MdIcon theme={outboundReaction === 'declined' ? 'Filled' : 'Outlined'}
                    >{'thumb_down'}</MdIcon
                  >
                </div>
                <div class="date">
                  <Text text={declineReactions.join(', ')} selectable />
                </div>
              </div>
            {/if}
          </KeyValueList.Item>
        </KeyValueList.Section>
      {/if}

      {#if sortedHistory.length > 0}
        <KeyValueList.Section
          title={$i18n.t('dialog--message-details.label--history', 'Edit History')}
          options={{
            disableItemInset: true,
          }}
        >
          <div class="history">
            {#each sortedHistory as historyEntry, index}
              <div class="version">
                <div class="badge">
                  <Text
                    color="mono-high"
                    text={`v${sortedHistory.length - index}`}
                    size="meta"
                    wrap={false}
                  />
                </div>

                <div class="detail">
                  <KeyValueList.Item
                    key={formatDateLocalized(historyEntry.at, $i18n, 'extended', use24hTime)}
                  >
                    {#if historyEntry.text === undefined}
                      <Text
                        color={'mono-low'}
                        text={$i18n.t('dialog--message-details.prose--empty-caption', 'No caption')}
                      />
                    {:else}
                      <Prose content={{sanitizedHtml: historyEntry.text}} />
                    {/if}
                  </KeyValueList.Item>
                </div>
              </div>
            {/each}
          </div>
        </KeyValueList.Section>
      {/if}
      {#if import.meta.env.DEBUG || import.meta.env.BUILD_ENVIRONMENT === 'sandbox'}
        <KeyValueList.Section title="Debug 🐞" options={{disableItemInset: true}}>
          {#if isStatusMessageId(id)}
            <KeyValueList.Item key="Status Message ID">
              <Text text={id} selectable />
            </KeyValueList.Item>
          {/if}
          {#if statusMessageType !== undefined}
            <KeyValueList.Item key="Status Message Type">
              <Text text={statusMessageType} selectable />
            </KeyValueList.Item>
          {/if}
          <KeyValueList.Item key="Direction">
            <Text text={direction ?? 'None'} selectable />
          </KeyValueList.Item>
          {#if file !== undefined}
            <KeyValueList.Item key="File Type">
              <Text text={file.type} selectable />
            </KeyValueList.Item>

            <KeyValueList.Item key="File Sync State">
              <Text text={file.sync.state} selectable />
            </KeyValueList.Item>

            <KeyValueList.Item key="Media Types">
              <Text
                text={`File: ${file.mediaType}, Thumbnail: ${file.thumbnail?.mediaType}`}
                selectable
              />
            </KeyValueList.Item>

            {#if file.thumbnail?.expectedDimensions !== undefined}
              <KeyValueList.Item key="Dimensions (reported)">
                <Text
                  text={`${file.thumbnail.expectedDimensions.width}x${file.thumbnail.expectedDimensions.height}`}
                  selectable
                />
              </KeyValueList.Item>
            {/if}

            {#if file.duration !== undefined}
              <KeyValueList.Item key="Duration (reported)">
                <Text text={`${file.duration.toFixed(2)} s`} selectable />
              </KeyValueList.Item>
            {/if}

            {#if file.imageRenderingType !== undefined}
              <KeyValueList.Item key="Image Rendering Type">
                <Text text={file.imageRenderingType} selectable />
              </KeyValueList.Item>
            {/if}
          {/if}
        </KeyValueList.Section>
      {/if}
    </KeyValueList>
  </div>
</Modal>

<style lang="scss">
  @use 'component' as *;

  .content {
    .reaction {
      display: flex;
      align-items: center;
      justify-content: start;
      gap: rem(8px);
      margin-top: rem(8px);

      .thumb {
        display: flex;
        align-items: center;
        justify-content: center;

        &.acknowledged {
          color: var(--mc-message-status-acknowledged-color);
        }
        &.declined {
          color: var(--mc-message-status-declined-color);
        }
      }
    }

    .history {
      display: grid;
      grid-template-columns: [badge] min-content [detail] 1fr;

      padding: 0 0 0 rem(16px);

      .version {
        grid-column: span 2;

        display: grid;
        // Use CSS Subgrid to ensure all cells of the first column grow equally.
        grid-template-columns: subgrid;
        align-items: center;
        position: relative;

        &:not(:first-child) .badge::before {
          display: block;
          height: calc(50% - rem(12px));
          top: 0;
        }

        &:not(:last-child) .badge::after {
          display: block;
          height: calc(50% - rem(12px));
          bottom: 0;
        }

        .badge {
          grid-area: badge;
          justify-self: center;

          display: flex;
          align-items: center;
          justify-content: center;

          min-width: rem(24px);
          height: rem(24px);
          border-radius: rem(12px);
          background-color: var(--cc-conversation-preview-background-color--active);
          white-space: nowrap;

          &::before,
          &::after {
            display: none;

            content: '';
            position: absolute;
            width: rem(1px);

            background-color: var(--ic-divider-background-color);
          }
        }

        .detail {
          grid-area: detail;
        }
      }
    }
  }
</style>
