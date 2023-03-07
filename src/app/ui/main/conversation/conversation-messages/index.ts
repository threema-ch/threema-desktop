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
    | 'showMessageDetails'
    | 'delete';
