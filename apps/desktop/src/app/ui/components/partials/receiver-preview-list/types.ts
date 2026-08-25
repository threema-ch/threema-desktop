import type {WeakOpaque} from '@threema/ts-utils/meta/newtype';

/**
 * A unique identifier of a receiver in a preview list.
 */
export type ReceiverPreviewListId = WeakOpaque<
    string,
    {readonly ReceiverPreviewListId: unique symbol}
>;

export type {InteractionEvent} from './internal/receiver-preview/props';
