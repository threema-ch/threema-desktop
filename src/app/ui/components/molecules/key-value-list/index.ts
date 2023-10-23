import KeyValueList from './KeyValueList.svelte';
import Item from './internal/item/Item.svelte';
import Section from './internal/section/Section.svelte';

/* eslint-disable import/no-default-export, @typescript-eslint/naming-convention */
export default Object.assign(KeyValueList, {
    Section: Object.assign(Section, {Item}),
    Item,
});
/* eslint-enable import/no-default-export, @typescript-eslint/naming-convention */
