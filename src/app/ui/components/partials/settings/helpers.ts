import type {
    SettingsDropdown,
    SettingsDropdownItem,
} from '~/app/ui/components/partials/settings/types';
import type {ContextMenuItem} from '~/app/ui/utils/context-menu/types';

/**
 * This functions creates a list of dropdownitems that can be used in a contextmenu
 *
 * @param dropdown A list of Dropdownitems of appropriate type
 * @param handler Callback to be called when the item is selected in the dropdown
 * @returns A list of ContextMenuItems
 */
export function createDropdownItems<TSettings, TSettingsKeys extends keyof TSettings, TSettingType>(
    dropdown: SettingsDropdown<TSettings, TSettingsKeys, TSettingType>,
    handler: (newValue: TSettingType, changeName: TSettingsKeys) => void,
): ContextMenuItem[] {
    const dropdownItems: ContextMenuItem[] = [];
    Object.entries<SettingsDropdownItem<TSettingType, TSettingsKeys>>({...dropdown}).forEach(
        ([value, item]) => {
            function cb(): void {
                handler(item.value, item.label);
            }
            const contextMenuItem: ContextMenuItem = {
                handler: cb,
                icon: item.options?.icon ?? undefined,
                label: item.text,
            };

            dropdownItems.push(contextMenuItem);
        },
    );

    return dropdownItems;
}
