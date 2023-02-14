/**
 * Compose area modes.
 *
 * TODO(DESK-173, DESK-303): Handle modes 'quote' (DESK-173) and 'attachment' (DESK-303).
 */
export type ComposeMode = 'text';

/**
 * Compose area data.
 *
 * Note that this may also contain state that isn't directly used by the current mode. For example,
 * when the user enters some text, then records an audio message, the text will not be shown. But it
 * will re-appear once the audio message is sent.
 */
export interface ComposeData {
    // Text entered into the compose area. This may be a text message, or a caption.
    text: string | undefined;

    // Attachment (from copy & paste, drag & drop, ...)
    attachment: Blob | undefined;
}

/**
 * What happens when pressing the enter key in the compose area?
 *
 * Either the message is submitted, or a newline is inserted.
 */
export type ComposeAreaEnterKeyMode = 'submit' | 'newline';
