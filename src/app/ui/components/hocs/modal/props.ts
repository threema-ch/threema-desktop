import type {SvelteNullableBinding} from '~/app/ui/utils/svelte';
import type {u53} from '~/common/types';

/**
 * Props accepted by the `Modal` component. Note: The modal will be rendered as a direct child of
 * `document.body`.
 */
export interface ModalProps {
    /**
     * Reference to the {@link HTMLElement} in this component which contains actions.
     */
    readonly actionsElement?: SvelteNullableBinding<HTMLElement>;
    /**
     * Reference to the {@link HTMLElement} of this modal.
     */
    readonly element?: SvelteNullableBinding<HTMLElement>;
    readonly options?: {
        /**
         * Whether the modal should be closable by pressing `Esc`. Defaults to `true`.
         */
        readonly allowClosingWithEsc?: boolean;
        /**
         * Whether to fire the submit event on click `Enter`. Defaults to `false`. Note: Closing
         * needs to be handled from outside.
         */
        readonly allowSubmittingWithEnter?: boolean;
        /**
         * Appearance of the surface behind the modal. Defaults to `"translucent"`.
         */
        readonly overlay?: 'opaque' | 'translucent';
        /**
         * Whether to suspend listening for global application hotkeys while the modal is visible.
         * Defaults to `true`.
         */
        readonly suspendHotkeysWhenVisible?: boolean;
    };
    /**
     * The target element this modal should be attached to. Defaults to `"#container"`.
     */
    readonly target?: SvelteNullableBinding<HTMLElement>;
    /**
     * Options to configure the modal wrapper.
     */
    readonly wrapper: NoneWrapperOptions | CardWrapperOptions;
}

interface CommonWrapperOptions {
    /**
     * The action buttons to display in the modal's top-right corner.
     */
    readonly actions?: ModalAction[];
}

interface NoneWrapperOptions extends CommonWrapperOptions {
    readonly type: 'none';
}

interface CardWrapperOptions extends CommonWrapperOptions {
    readonly type: 'card';
    /**
     * Buttons to display in the card's footer.
     */
    readonly buttons?: ModalButton[];
    /**
     * Whether to add an elevation effect to the modal container. Defaults to `true`.
     */
    readonly elevated?: boolean;
    /**
     * Whether to use as much of the available width as possible (`"expansive"`) or only as much as
     * needed to display the content comfortably (`"compact"`) within the given `minWidth` and
     * `maxWidth` constraints. Defaults to `"expansive"`.
     */
    readonly layout?: 'compact' | 'expansive';
    /**
     * Optional minimum width of the modal card, in pixels. Defaults to `320`.
     */
    readonly minWidth?: u53;
    /**
     * Optional maximum width of the modal card, in pixels. Defaults to 100% of the parent.
     */
    readonly maxWidth?: u53;
    readonly title?: string;
}

interface ModalAction {
    readonly iconName: string;
    readonly onClick?: (() => void) | 'close';
}

export interface ModalButton {
    readonly disabled?: boolean;
    /**
     * Whether the button should get autofocused as soon as it's rendered.
     *
     * Note: This should only be set on one button if you have multiple, as it could lead to
     * unexpected behavior otherwise, because only one element can be focused at a time.
     *
     * Note: This is not reactive, as it's not recommended to change focus after the modal has been
     * opened (a11y).
     */
    readonly isFocused?: boolean;
    readonly label: string;
    readonly onClick?: ((event: MouseEvent) => void) | 'close' | 'submit';
    readonly type: 'naked' | 'filled';
    readonly state?: 'default' | 'loading';
}
