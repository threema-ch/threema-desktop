import type {AppServicesForSvelte} from '~/app/types';
import type {ContextMenuProviderProps} from '~/app/ui/components/hocs/context-menu-provider/props';
import type {ReceiverPreviewListItem} from '~/app/ui/components/partials/receiver-preview-list/props';
import type {IQueryableStore} from '~/common/utils/store';
import type {AnyReceiverDataOrSelf} from '~/common/viewmodel/utils/receiver';

/**
 * Props accepted by the `ReceiverPreview` component.
 */
export interface ReceiverPreviewProps {
    readonly active: boolean;
    readonly contextMenuOptions?: Omit<ContextMenuProviderProps, 'popover'>;
    /**
     * Optional substring(s) to highlight in conversation preview text fields.
     */
    readonly highlights?: string | readonly string[];
    /**
     * The interaction mode of the component, e.g. whether it is clickable, selectable, or not.
     * Defaults to `"none"`.
     */
    readonly interaction?: InteractionMode;

    readonly oninteraction?: InteractionEventHandler;

    readonly options?: {
        /**
         * Whether this receiver should be highlighted when it is marked as `active`. Defaults to
         * `true` if the `interaction` mode is `"click"`, else to `false`.
         */
        readonly highlightWhenActive?: boolean;
    };
    readonly services: Pick<AppServicesForSvelte, 'profilePicture' | 'router' | 'settings'>;
    readonly store: IQueryableStore<ReceiverPreviewListItem<unknown>>;
}

/**
 * Event that is emitted on interaction with `ReceiverPreview`, corresponds to selected `InteractionMode`
 */
export type InteractionEvent = InteractionClickEvent | InteractionSelectEvent;

/**
 * Determines the mode of interaction and how the `ReceiverPreview` element behaves
 */
type InteractionMode = InteractionModeNone | InteractionModeClick | InteractionModeSelect;

/**
 * All currently supported interactions that can trigger an event
 */
type InteractionEventType = 'click' | 'select';

/**
 * Propagates events for the corresponding `InteractionEvent`
 */
type InteractionEventHandler = (event: InteractionEvent) => void;

/**
 * The foundational interaction mode just defines the mode of interaction without additional data.
 * Note: In addition to `InteractionEventType` we also define 'none' here as it is a valid mode but
 * will never cause an emitted even.
 */
interface BaseInteractionMode<T extends InteractionEventType | 'none'> {
    readonly mode: T;
}

/**
 * Config for the non-interactive mode of the `ReceiverPreview` component, which means the component
 * cannot be interacted with.
 */
type InteractionModeNone = BaseInteractionMode<'none'>;

/**
 * Config for the clickable mode of the `ReceiverPreview` component, which means the component can
 * be clicked and will emit `InteractionClickEvent`.
 */
type InteractionModeClick = BaseInteractionMode<'click'>;

/**
 * Config for the selectable mode of the `ReceiverPreview` component, which means the component can
 * be marked as selected by toggling a checkbox and will emit `InteractionSelectEvent`.
 *
 * Note: The selection state needs to be managed by the parent by handling the
 * `InteractionSelectEvent` event and updating `isSelected` accordingly.
 */
interface InteractionModeSelect extends BaseInteractionMode<'select'> {
    readonly isSelected: boolean;
}

/**
 * The foundational interaction event just defines the type of the event without additional data.
 * The `type` will always correspond to the `mode` of the selected `InteractionMode`
 */
interface BaseInteractionEvent<T extends InteractionEventType> {
    readonly type: T;
}

/**
 * Event that is triggered if `ReceiverPreview` interaction mode is 'click'
 */
interface InteractionClickEvent extends BaseInteractionEvent<'click'> {
    readonly receiver: AnyReceiverDataOrSelf;
    readonly active: boolean;
}

/**
 * Event that is triggered if `ReceiverPreview` interaction mode is 'select'
 */
interface InteractionSelectEvent extends BaseInteractionEvent<'select'> {
    readonly receiver: AnyReceiverDataOrSelf;
    readonly selected: boolean;
}
