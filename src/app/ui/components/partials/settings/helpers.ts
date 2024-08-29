import type {ContextMenuItem} from '~/app/ui/components/hocs/context-menu-provider/types';
import type {SettingsDropdown} from '~/app/ui/components/partials/settings/types';
import type {u53} from '~/common/types';

/**
 * This functions creates a list of {@link ContextMenuItem}s that can be used for a settings
 * dropdown.
 *
 * @param dropdown A list of dropdown items of the appropriate type.
 * @param handler Handler function to call when a dropdown item is selected.
 * @returns A list of ContextMenuItems.
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
        type: 'option',
        handler: () => handler(item.value, dropdown.updateKey),
        icon: item.options?.icon ?? undefined,
        label: item.text,
    }));
}
