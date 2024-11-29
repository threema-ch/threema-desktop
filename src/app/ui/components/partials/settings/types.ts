import type {ContextMenuOption} from '~/app/ui/components/hocs/context-menu-provider/types';
import type {Remote} from '~/common/utils/endpoint';
import type {SettingsViewModelStore} from '~/common/viewmodel/settings/store';

/**
 * Type of the value contained in a `SettingsViewModelStore` transferred from {@link Remote}.
 */
export type RemoteSettingsViewModelStoreValue = Remote<ReturnType<SettingsViewModelStore['get']>>;

/**
 * A single item in a dropdown menu.
 */
export interface SettingsDropdownItem<TValue> {
    /**
     * Textual description of the item
     */
    readonly text: string;
    readonly options?: {
        readonly icon?: ContextMenuOption['icon'];
    };
    /**
     * The value that the item represents
     */
    readonly value: TValue;
}

/**
 * An array of dropdown items belonging to a single setting.
 *
 * Example: This could be a list of languages for the "Language" setting.
 *
 * The type ensures that each item can only have a label that is a valid key of {@link TSetting}.
 */
export interface SettingsDropdown<
    TSetting,
    TSettingType,
    TUpdateKey extends keyof TSetting | undefined = keyof TSetting,
> {
    readonly updateKey: TUpdateKey;
    readonly items: SettingsDropdownItem<TSettingType>[];
}
