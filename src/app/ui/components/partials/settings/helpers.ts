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
export function createDropdownItems<
    TSettings,
    TSettingType,
    TUpdateKey extends keyof TSettings | undefined = keyof TSettings,
>(
    dropdown: SettingsDropdown<TSettings, TSettingType, TUpdateKey>,
    handler: (newValue: TSettingType, updateKey: TUpdateKey) => void,
): ContextMenuItem[] {
    type DropdownItem = (typeof dropdown.items)[u53];

    return Object.values<DropdownItem>({...dropdown.items}).map((item) => ({
        handler: () => handler(item.value, dropdown.updateKey),
        icon: item.options?.icon ?? undefined,
        label: item.text,
    }));
}
