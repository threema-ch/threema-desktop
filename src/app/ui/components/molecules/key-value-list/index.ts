import KeyValueList from './KeyValueList.svelte';
import Item from './internal/item/Item.svelte';
import ItemWithButton from './internal/item-with-button/ItemWithButton.svelte';
import ItemWithDropdown from './internal/item-with-dropdown/ItemWithDropdown.svelte';
import ItemWithSwitch from './internal/item-with-switch/ItemWithSwitch.svelte';
import Section from './internal/section/Section.svelte';

/* eslint-disable import/no-default-export, @typescript-eslint/naming-convention */
export default Object.assign(KeyValueList, {
    Section: Object.assign(Section, {Item, ItemWithButton, ItemWithDropdown, ItemWithSwitch}),
    Item,
    ItemWithButton,
    ItemWithDropdown,
    ItemWithSwitch,
});
/* eslint-enable import/no-default-export, @typescript-eslint/naming-convention */
