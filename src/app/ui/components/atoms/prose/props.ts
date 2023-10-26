import type {SanitizedHtml} from '~/app/ui/utils/text';

/**
 * Props accepted by the `Prose` component.
 */
export interface ProseProps {
    content:
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
    /** Whether text is selectable. */
    selectable?: boolean;
    /** Whether text should wrap. Defaults to `true`. */
    wrap?: boolean;
}
