<!--
  @component 
  Renders a modal with details about a message.
-->
<script lang="ts">
  import MdIcon from 'threema-svelte-components/src/components/blocks/Icon/MdIcon.svelte';
  import Label from '~/app/ui/components/atoms/label/Label.svelte';
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
  export let status: $$Props['status'];

  $: lastReaction = reactions?.reduce<(typeof reactions)[u53] | undefined>(
    (acc, curr) => (curr.at > (acc?.at ?? 0) ? curr : acc),
    undefined,
  );

  // TODO: Add correlation-id, media-types (file and thumbnail), image rendering type, and animated.
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
          <Label text={formatDateLocalized(status.created.at, $i18n, 'extended')} />
        </KeyValueList.Item>
        {#if status.received !== undefined}
          <KeyValueList.Item
            key={$i18n.t('dialog--message-details.label--received-date', 'Received')}
          >
            <Label text={formatDateLocalized(status.received.at, $i18n, 'extended')} />
          </KeyValueList.Item>
        {/if}
        {#if status.sent !== undefined}
          <KeyValueList.Item key={$i18n.t('dialog--message-details.label--sent-date', 'Sent')}>
            <Label text={formatDateLocalized(status.sent.at, $i18n, 'extended')} />
          </KeyValueList.Item>
        {/if}
        {#if status.delivered !== undefined}
          <KeyValueList.Item
            key={$i18n.t('dialog--message-details.label--delivered-date', 'Delivered')}
          >
            <Label text={formatDateLocalized(status.delivered.at, $i18n, 'extended')} />
          </KeyValueList.Item>
        {/if}
        {#if status.read !== undefined}
          <KeyValueList.Item key={$i18n.t('dialog--message-details.label--read-date', 'Read')}>
            <Label text={formatDateLocalized(status.read.at, $i18n, 'extended')} />
          </KeyValueList.Item>
        {/if}
      </KeyValueList.Section>

      <KeyValueList.Section>
        <KeyValueList.Item key={$i18n.t('dialog--message-details.label--message-id', 'Message ID')}>
          <Label text={u64ToHexLe(id)} />
        </KeyValueList.Item>
      </KeyValueList.Section>

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
                <Label text={formatDateLocalized(lastReaction.at, $i18n, 'extended')} />
              </div>
            </div>
          {/if}
        </KeyValueList.Item>
      </KeyValueList.Section>

      {#if import.meta.env.DEBUG || import.meta.env.BUILD_ENVIRONMENT === 'sandbox'}
        <KeyValueList.Section title="Debug 🐞">
          <KeyValueList.Item key="Direction">
            <Label text={direction} />
          </KeyValueList.Item>

          {#if file !== undefined}
            <KeyValueList.Item key="File Type">
              <Label text={file.type} />
            </KeyValueList.Item>

            <KeyValueList.Item key="File Sync State">
              <Label text={file.sync.state} />
            </KeyValueList.Item>

            <KeyValueList.Item key="File Size (reported)">
              <Label text={`${(file.sizeInBytes / 1024).toFixed(0)} KiB`} />
            </KeyValueList.Item>

            {#if file.thumbnail?.expectedDimensions !== undefined}
              <KeyValueList.Item key="Dimensions (reported)">
                <Label
                  text={`${file.thumbnail.expectedDimensions.width}x${file.thumbnail.expectedDimensions.height}`}
                />
              </KeyValueList.Item>
            {/if}

            {#if file.duration !== undefined}
              <KeyValueList.Item key="Duration (reported)">
                <Label text={`${file.duration.toFixed(2)} s`} />
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
