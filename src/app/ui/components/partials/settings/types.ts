/**
 * A single item in a dropdown menu.
 */
export interface SettingsDropdownItem<TValue, TLabel> {
    /**
     * Textual description of the item
     */
    readonly text: string;
    readonly options?: {
        readonly icon?: {
            readonly label: string;
            readonly color?: string;
            readonly filled?: boolean;
        };
    };
    /**
     * The value that the item represents
     */
    readonly value: TValue;
    /**
     * The label that it belongs to (e.g for updates)
     */
    readonly label: TLabel;
}

/**
 * An array of dropdown items belonging to a single setting.
 *
 * Example: This could be a list of languages for the "Language" setting.
 *
 * The type ensures that each item can only have a label that is a valid key of {@link TSetting}.
 */
export type SettingsDropdown<
    TSetting,
    TSettingKey extends keyof TSetting,
    TSettingType,
> = SettingsDropdownItem<TSettingType, TSettingKey>[];
