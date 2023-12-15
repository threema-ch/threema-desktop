import type {SettingsDropdown} from '~/app/ui/components/partials/settings/types';
import type {ContextMenuItem} from '~/app/ui/utils/context-menu/types';
import type {u53} from '~/common/types';

/**
 * This functions creates a list of dropdownitems that can be used in a contextmenu
 *
 * @param dropdown A list of Dropdownitems of appropriate type
 * @param handler Callback to be called when the item is selected in the dropdown
 * @returns A list of ContextMenuItems
 */
export function createDropdownItems<TSettings, TSettingType>(
    dropdown: SettingsDropdown<TSettings, TSettingType>,
    handler: (newValue: TSettingType, newLabel: keyof TSettings) => void,
): ContextMenuItem[] {
    type DropdownItem = (typeof dropdown)[u53];

    return Object.values<DropdownItem>({...dropdown}).map((item) => ({
        handler: () => handler(item.value, item.label),
        icon: item.options?.icon ?? undefined,
        label: item.text,
    }));
}
