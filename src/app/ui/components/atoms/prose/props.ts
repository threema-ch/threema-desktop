import type {SanitizedHtml} from '~/app/ui/utils/text';
import type {u53} from '~/common/types';

/**
 * Props accepted by the `Prose` component.
 */
export interface ProseProps {
    readonly content:
        | {
              /**
               * Sanitized HTML to render as formatted content.
               *
               * Note: As the name implies, the content must be already sanitized, as it will be
               * rendered as-is, and Svelte does not sanitize expressions before injecting HTML.
               */
              sanitizedHtml: SanitizedHtml;
          }
        | {
              /** The text to render as the content. */
              text: string;
          };
    readonly options?: {
        readonly truncate?: AnyTruncateTextOptions;
    };
    /** Whether text is selectable. */
    readonly selectable?: boolean;
    /** Whether text should wrap. Defaults to `true`. */
    readonly wrap?: boolean;
}

export type AnyTruncateTextOptions =
    | AroundTruncateTextOptions
    | EndTruncateTextOptions
    | StartTruncateTextOptions;

interface CommonTruncateTextOptions {
    /**
     * The maximum allowed character count. If it is exceeded, the text will be truncated to this
     * length. Note: "character" count refers to the number of grapheme clusters.
     */
    readonly max: u53;
}

interface AroundTruncateTextOptions extends CommonTruncateTextOptions {
    /**
     * Truncate from the center of the text or around the given focus points.
     */
    readonly type: 'around';
    /**
     * Substrings to try to keep in focus when truncating. Note:
     *
     * - If `undefined` or empty, the text will be truncated from the center.
     * - If it is not possible to satisfy both `max` and the given focus points, `max` will be
     *   honored, but `focuses` will only be tried to be satisfied as well as possible.
     */
    readonly focuses?: string[];
}

interface EndTruncateTextOptions extends CommonTruncateTextOptions {
    /**
     * Truncate from the end of the text.
     */
    readonly type: 'end';
}

interface StartTruncateTextOptions extends CommonTruncateTextOptions {
    /**
     * Truncate from the beginning of the text.
     */
    readonly type: 'start';
}
