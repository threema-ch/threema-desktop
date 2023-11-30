import type {HTMLInputAttributes} from 'svelte/elements';

/**
 * Props accepted by the `Switch` component.
 */
export interface SwitchProps extends HTMLInputAttributes {
    readonly checked?: boolean;
    readonly disabled?: boolean;
}
