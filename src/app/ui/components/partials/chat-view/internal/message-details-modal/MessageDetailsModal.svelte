<!--
  @component
  Renders a modal with details about a message.
-->
<script lang="ts">
  import MdIcon from 'threema-svelte-components/src/components/blocks/Icon/MdIcon.svelte';
  import Text from '~/app/ui/components/atoms/text/Text.svelte';
  import Modal from '~/app/ui/components/hocs/modal/Modal.svelte';
  import KeyValueList from '~/app/ui/components/molecules/key-value-list';
  import type {MessageDetailsModalProps} from '~/app/ui/components/partials/chat-view/internal/message-details-modal/props';
  import {i18n} from '~/app/ui/i18n';
  import {formatDateLocalized} from '~/app/ui/utils/timestamp';
  import type {u53} from '~/common/types';
  import {u64ToHexLe} from '~/common/utils/number';

  type $$Props = MessageDetailsModalProps;

  export let direction: $$Props['direction'];
  export let file: $$Props['file'] = undefined;
  export let id: $$Props['id'];
  export let reactions: $$Props['reactions'];
  export let services: $$Props['services'];
  export let status: $$Props['status'];

  const {
    storage: {is24hTime},
  } = services;

  $: lastReaction = reactions?.reduce<(typeof reactions)[u53] | undefined>(
    (acc, curr) => (curr.at > (acc?.at ?? 0) ? curr : acc),
    undefined,
  );
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
    title: $i18n.t('dialog--message-details.label--title', 'Message Details'),
  }}
  on:close
>
  <div class="content">
    <KeyValueList>
      <KeyValueList.Section>
        <KeyValueList.Item key={$i18n.t('dialog--message-details.label--created-date', 'Created')}>
          <Text
            text={formatDateLocalized(status.created.at, $i18n, 'extended', {hour12: !$is24hTime})}
          />
        </KeyValueList.Item>
        {#if status.received !== undefined}
          <KeyValueList.Item
            key={$i18n.t('dialog--message-details.label--received-date', 'Received')}
          >
            <Text
              text={formatDateLocalized(status.received.at, $i18n, 'extended', {
                hour12: !$is24hTime,
              })}
            />
          </KeyValueList.Item>
        {/if}
        {#if status.sent !== undefined}
          <KeyValueList.Item key={$i18n.t('dialog--message-details.label--sent-date', 'Sent')}>
            <Text
              text={formatDateLocalized(status.sent.at, $i18n, 'extended', {hour12: !$is24hTime})}
            />
          </KeyValueList.Item>
        {/if}
        {#if status.delivered !== undefined}
          <KeyValueList.Item
            key={$i18n.t('dialog--message-details.label--delivered-date', 'Delivered')}
          >
            <Text
              text={formatDateLocalized(status.delivered.at, $i18n, 'extended', {
                hour12: !$is24hTime,
              })}
            />
          </KeyValueList.Item>
        {/if}
        {#if status.read !== undefined}
          <KeyValueList.Item key={$i18n.t('dialog--message-details.label--read-date', 'Read')}>
            <Text
              text={formatDateLocalized(status.read.at, $i18n, 'extended', {hour12: !$is24hTime})}
            />
          </KeyValueList.Item>
        {/if}
      </KeyValueList.Section>

      <KeyValueList.Section>
        <KeyValueList.Item key={$i18n.t('dialog--message-details.label--message-id', 'Message ID')}>
          <Text text={u64ToHexLe(id)} />
        </KeyValueList.Item>
      </KeyValueList.Section>

      {#if file !== undefined}
        <KeyValueList.Section>
          <KeyValueList.Item key={$i18n.t('dialog--message-details.label--file-name', 'File Name')}>
            <Text text={file.name.raw ?? file.name.default} />
          </KeyValueList.Item>

          <KeyValueList.Item key={$i18n.t('dialog--message-details.label--file-size', 'File Size')}>
            <Text text={`${(file.sizeInBytes / 1000).toFixed(0)} kB`} />
          </KeyValueList.Item>

          <KeyValueList.Item
            key={$i18n.t('dialog--message-details.label--media-type', 'Media Type')}
          >
            <Text text={file.mediaType} />
          </KeyValueList.Item>
        </KeyValueList.Section>
      {/if}

      <KeyValueList.Section>
        <KeyValueList.Item
          key={$i18n.t('dialog--message-details.label--last-reaction', 'Last Reaction')}
        >
          {#if lastReaction === undefined}
            -
          {:else}
            <div class="reaction">
              <div class={`thumb ${lastReaction.type}`}>
                <MdIcon theme="Filled"
                  >{lastReaction.type === 'acknowledged' ? 'thumb_up' : 'thumb_down'}</MdIcon
                >
              </div>
              <div class="date">
                <Text
                  text={formatDateLocalized(lastReaction.at, $i18n, 'extended', {
                    hour12: !$is24hTime,
                  })}
                />
              </div>
            </div>
          {/if}
        </KeyValueList.Item>
      </KeyValueList.Section>

      {#if import.meta.env.DEBUG || import.meta.env.BUILD_ENVIRONMENT === 'sandbox'}
        <KeyValueList.Section title="Debug 🐞">
          <KeyValueList.Item key="Direction">
            <Text text={direction} />
          </KeyValueList.Item>

          {#if file !== undefined}
            <KeyValueList.Item key="File Type">
              <Text text={file.type} />
            </KeyValueList.Item>

            <KeyValueList.Item key="File Sync State">
              <Text text={file.sync.state} />
            </KeyValueList.Item>

            <KeyValueList.Item key="Media Types">
              <Text text={`File: ${file.mediaType}, Thumbnail: ${file.thumbnail?.mediaType}`} />
            </KeyValueList.Item>

            {#if file.thumbnail?.expectedDimensions !== undefined}
              <KeyValueList.Item key="Dimensions (reported)">
                <Text
                  text={`${file.thumbnail.expectedDimensions.width}x${file.thumbnail.expectedDimensions.height}`}
                />
              </KeyValueList.Item>
            {/if}

            {#if file.duration !== undefined}
              <KeyValueList.Item key="Duration (reported)">
                <Text text={`${file.duration.toFixed(2)} s`} />
              </KeyValueList.Item>
            {/if}

            {#if file.imageRenderingType !== undefined}
              <KeyValueList.Item key="Image Rendering Type">
                <Text text={file.imageRenderingType} />
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
  }
</style>
