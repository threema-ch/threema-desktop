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
         * Whether to suspend listening for global application hotkeys while the modal is visible.
         * Defaults to `true`.
         */
        readonly suspendHotkeysWhenVisible?: boolean;
        /**
         * Whether the modal should be closable by pressing `esc`. Defaults to `true`.
         */
        readonly allowClosingWithEsc?: boolean;
    };
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
     * Optional minimum width of the modal card, in pixels. Defaults to `460`. Note: The modal
     * cannot overflow the viewport, and the given `minWidth` is only used if it's smaller than the
     * current viewport size.
     */
    readonly minWidth?: u53;
    readonly title?: string;
}

interface ModalAction {
    readonly iconName: string;
    readonly onClick?: (() => void) | 'close';
}

interface ModalButton {
    readonly disabled?: boolean;
    /**
     * Whether the button should get autofocused as soon as it's rendered. Note: This should only be
     * set on one button if you have multiple, as it could lead to unexpected behavior otherwise,
     * because only one element can be focused at a time.
     */
    readonly isFocused?: boolean;
    readonly label: string;
    readonly onClick?: (() => void) | 'close';
    readonly type: 'naked' | 'filled';
}
