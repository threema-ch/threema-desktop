/**
 * Context menu selection events which may be dispatched by the message context menu.
 */
export type ConversationMessageContextMenuEvent =
    | 'thumbup'
    | 'thumbdown'
    | 'quote'
    | 'forward'
    | 'copy'
    | 'copyLink'
    | 'save'
    | 'showMessageDetails'
    | 'delete';

/**
 * States used to describe the progress when loading an image.
 */
export type ConversationMessageImageState =
    | {status: 'loading'}
    | {status: 'failed'}
    | {status: 'loaded'; url: string};
