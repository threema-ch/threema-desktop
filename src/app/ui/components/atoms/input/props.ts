import type {u53} from '~/common/types';

export interface InputProps {
    /**
     * The user input.
     */
    readonly value: string;
    /**
     * The hinting label of the Input element.
     */
    readonly label?: string;
    /**
     * May occurred error description.
     */
    readonly error?: string;
    /**
     * Any helping description.
     */
    readonly help?: string;
    /**
     * Define the max char length of the input.
     */
    readonly maxlength?: u53;
    /**
     * Determine if input can be changed by the user.
     */
    readonly disabled?: boolean;
    /**
     * Determine if input should be, if possible, checked for spelling errors.
     */
    readonly spellcheck?: boolean;
    /**
     * Whether this field should be autofocussed.
     *
     * Note: This should only be set on one input element if you have multiple, as it could lead to
     * unexpected behavior otherwise, because only one element can be focused at a time.
     */
    readonly autofocus?: boolean;
}
