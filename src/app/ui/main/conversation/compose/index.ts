import {type Remote} from '~/common/utils/endpoint';
import {type RemoteStore} from '~/common/utils/store';
import {type ConversationMessageViewModel} from '~/common/viewmodel/conversation-message';

/**
 * Compose area data.
 *
 * Note that this may also contain state that isn't directly used by the current mode. For example,
 * when the user enters some text, then records an audio message, the text will not be shown. But it
 * will re-appear once the audio message is sent.
 */
export type ComposeData = TextComposeData | QuoteComposeData;

interface TextComposeData extends BaseComposeData {
    /** @inheritdoc */
    readonly mode: 'text';

    /** @inheritdoc */
    readonly quotedMessageViewModel: undefined;
}

interface QuoteComposeData extends BaseComposeData {
    /** @inheritdoc */
    readonly mode: 'quote';

    /** @inheritdoc */
    readonly attachment: undefined;

    /** @inheritdoc */
    readonly quotedMessageViewModel: RemoteStore<Remote<ConversationMessageViewModel>>;
}

interface BaseComposeData {
    /**
     * Compose area modes.
     */
    readonly mode: 'text' | 'quote';

    /**
     * Text entered into the compose area. This may be a text message, or a caption.
     */
    readonly text: string | undefined;

    /**
     * Attachment (from copy & paste, drag & drop, ...)
     */
    readonly attachment: Blob | undefined;

    /**
     * Quoted Message ID
     */
    readonly quotedMessageViewModel: RemoteStore<Remote<ConversationMessageViewModel>> | undefined;
}

/**
 * What happens when pressing the enter key in the compose area?
 *
 * Either the message is submitted, or a newline is inserted.
 */
export type ComposeAreaEnterKeyMode = 'submit' | 'newline';

/**
 * The timeout to debounce byte length recounts by.
 */
export const DEBOUNCE_TIMEOUT_TO_RECOUNT_TEXT_BYTES_MILLIS = 300;
