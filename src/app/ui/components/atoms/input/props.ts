import type {u53} from '~/common/types';

export interface InputProps {
    /**
     * Whether this field should be autofocused on mount. Defaults to `false`.
     *
     * Note: This should only be set on one input element if you have multiple, as it could lead to
     * unexpected behavior otherwise, because only one element can be focused at a time.
     */
    readonly autofocus?: boolean;
    /**
     * Whether the input element is disabled (i.e., the input value cannot be changed by the user).
     * Defaults to `false`.
     */
    readonly disabled?: boolean;
    /**
     * Error message to display below the input element. If present, the element will also be styled
     * accordingly to signal that an error happened.
     */
    readonly error?: string;
    /**
     * Additional description to display below the input element. Note: Will not be shown in case
     * this component also has an `error`.
     */
    readonly help?: string;
    /**
     * HTML `id` to add to this input element.
     */
    readonly id: string;
    /**
     * Text label to display above the input element.
     */
    readonly label?: string;
    /**
     * Maximum allowed input string length.
     */
    readonly maxlength?: u53;
    /**
     * Browser hint to control whether the input should be checked for spelling errors. Unspecified
     * by default.
     */
    readonly spellcheck?: boolean;
    /**
     * The current value of the input element.
     */
    readonly value: string;
}
