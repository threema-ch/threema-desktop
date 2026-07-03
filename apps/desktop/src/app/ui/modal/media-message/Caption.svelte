<script lang="ts">
  import type {u53} from '@threema/ts-utils/integer/u53';

  import type {AppServicesForSvelte} from '~/app/types';
  import TextArea from '~/app/ui/components/atoms/textarea/TextArea.svelte';
  import type {TextAreaProps} from '~/app/ui/components/atoms/textarea/props';
  import {i18n} from '~/app/ui/i18n';
  import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';

  interface Props {
    /**
     * Whether this field should be autofocused on mount. Defaults to `false`.
     *
     * Note: This should only be set on one input element if you have multiple, as it could lead to
     * unexpected behavior otherwise, because only one element can be focused at a time.
     */
    readonly autofocus?: boolean;
    readonly enterKeyMode?: TextAreaProps['enterKeyMode'];
    readonly initialText?: string | undefined;
    readonly onpastefiles?: TextAreaProps['onpastefiles'];
    readonly onsubmit?: TextAreaProps['onsubmit'];
    readonly ontextbytelengthdidchange?: TextAreaProps['ontextbytelengthdidchange'];
    readonly services: Pick<AppServicesForSvelte, 'electron'>;
  }

  const {
    autofocus = false,
    enterKeyMode = 'submit',
    initialText = undefined,
    onpastefiles,
    onsubmit,
    ontextbytelengthdidchange,
    services,
  }: Props = $props();

  let composeAreaComponent = $state<SvelteNullableBinding<TextArea>>();

  /**
   * Focus caption input
   */
  export function focus(): void {
    composeAreaComponent?.focus();
  }

  /**
   * Get text of compose area
   */
  export function getText(): string {
    return composeAreaComponent?.getText() ?? '';
  }

  /**
   * Return the current byte length of the compose area's text content. This operation can be
   * expensive, and should only be used sparingly.
   */
  export function getTextByteLength(): u53 {
    return composeAreaComponent?.getTextByteLength() ?? 0;
  }

  /**
   * Insert more text content into the compose area
   */
  export function insertText(text: string): void {
    composeAreaComponent?.insertText(text);
  }

  /**
   * Clear the contents of the compose area.
   */
  export function clearText(): void {
    composeAreaComponent?.clear();
  }
</script>

<div>
  <TextArea
    bind:this={composeAreaComponent}
    {autofocus}
    {enterKeyMode}
    {initialText}
    {onpastefiles}
    {onsubmit}
    {ontextbytelengthdidchange}
    placeholder={$i18n.t(
      'dialog--compose-media-message.label--media-message-caption',
      'Add a Caption',
    )}
    {services}
  />
</div>

<style lang="scss">
  @use 'component' as *;
  div {
    font-size: rem(14px);
    --cc-compose-area-margin: 0;
    --cc-compose-area-padding: 0;
  }
</style>
