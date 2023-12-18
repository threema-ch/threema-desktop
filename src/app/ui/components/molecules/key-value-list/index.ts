import KeyValueList from './KeyValueList.svelte';
import Item from './internal/item/Item.svelte';
import ItemWithButton from './internal/item-with-button/ItemWithButton.svelte';
import ItemWithDropdown from './internal/item-with-dropdown/ItemWithDropdown.svelte';
import ItemWithSwitch from './internal/item-with-switch/ItemWithSwitch.svelte';
import Section from './internal/section/Section.svelte';

/**
 * Builds the component hierarchy for `KeyValueList` and its descendants, so they can be used with
 * dot notation. The following components can be composed:
 *
 * - `KeyValueList`: Wrapper component.
 * - `KeyValueList.Section`: Groups multiple items and is visually separated from other sections.
 * - `KeyValueList.Item`: A single list item with a title (`key`) and arbitraty content.
 * - `KeyValueList.ItemWithButton`: A special variant of an item, which includes a button (and is
 *   clickable itself).
 * - `KeyValueList.ItemWithDropdown`: A special variant of an item, which includes a dropdown (and
 *   is clickable itself).
 * - `KeyValueList.ItemWithSwitch`: A special variant of an item, which includes a toggle switch
 *   (and is clickable itself).
 *
 * @example
 * ```ts
 * <KeyValueList>
 *     <KeyValueList.Section key="First Section">
 *         <KeyValueList.Item key="First Item">
 *             // Content of the first item...
 *         </KeyValueList.Item>
 *     </KeyValueList.Section>
 * </KeyValueList>
 * ```
 */

/* eslint-disable import/no-default-export, @typescript-eslint/naming-convention */
export default Object.assign(KeyValueList, {
    Section: Object.assign(Section, {Item, ItemWithButton, ItemWithDropdown, ItemWithSwitch}),
    Item,
    ItemWithButton,
    ItemWithDropdown,
    ItemWithSwitch,
});
/* eslint-enable import/no-default-export, @typescript-eslint/naming-convention */
