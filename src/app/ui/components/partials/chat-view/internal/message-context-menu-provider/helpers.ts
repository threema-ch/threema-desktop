import type {MessageContextMenuItem} from '~/app/ui/components/partials/chat-view/internal/message-context-menu-provider/types';
import type {I18nType} from '~/app/ui/i18n-types';
import {nodeContainsTarget, nodeIsTarget} from '~/app/ui/utils/node';

/**
 * Extracts the url of the clicked anchor tag, if it was the event target, or returns `undefined`
 * otherwise.
 */
export function extractHrefFromEventTarget(event: MouseEvent): string | undefined {
    // `event.target` could be `null`.
    // eslint-disable-next-line @typescript-eslint/ban-types
    const href = (event.target as HTMLElement | null)?.getAttribute('href') ?? undefined;
    return href === undefined || href.length === 0 ? undefined : href;
}

/**
 * Extracts selected text, but only if the event target is part of the selection.
 */
export function extractSelectedTextFromEventTarget(event: MouseEvent): string | undefined {
    // `event.target` could be `null`.
    // eslint-disable-next-line @typescript-eslint/ban-types
    const element = (event.target as HTMLElement | null) ?? undefined;
    const selection = document.getSelection() ?? undefined;
    const range =
        selection !== undefined && selection.rangeCount > 0 ? selection.getRangeAt(0) : undefined;

    if (element === undefined || range === undefined) {
        return undefined;
    }

    if (
        nodeIsTarget(range.commonAncestorContainer, event.target) ||
        nodeContainsTarget(range.commonAncestorContainer.parentElement, event.target)
    ) {
        const text = selection?.toString();

        if (text !== undefined && text.length > 0) {
            return text;
        }
    }

    return undefined;
}

type ContextMenuItemHandler = Exclude<MessageContextMenuItem, 'divider'>['handler'];

/**
 * Get the appropriate context menu options for a specific message configuration.
 */
export function getContextMenuItems({
    copyLink,
    copyImage,
    copySelection,
    copy,
    saveAsFile,
    acknowledge,
    decline,
    quote,
    forward,
    openDetails,
    deleteMessage,
    t,
}: {
    copyLink?: ContextMenuItemHandler;
    copyImage?: ContextMenuItemHandler;
    copySelection?: ContextMenuItemHandler;
    copy?: ContextMenuItemHandler;
    saveAsFile?: ContextMenuItemHandler;
    acknowledge?: {
        filled?: boolean;
        handler: ContextMenuItemHandler;
    };
    decline?: {
        filled?: boolean;
        handler: ContextMenuItemHandler;
    };
    quote?: ContextMenuItemHandler;
    forward?: ContextMenuItemHandler;
    openDetails?: ContextMenuItemHandler;
    deleteMessage?: ContextMenuItemHandler;
    t: I18nType['t'];
}): Readonly<MessageContextMenuItem[]> {
    return [
        ...(copySelection !== undefined
            ? [
                  {
                      handler: copySelection,
                      icon: 'subject',
                      label: t('messaging.action--message-option-copy-selection', 'Copy Selection'),
                  },
              ]
            : []),
        ...(copyLink !== undefined
            ? [
                  {
                      handler: copyLink,
                      icon: 'link',
                      label: t('messaging.action--message-option-copy-link', 'Copy Link'),
                  },
              ]
            : []),
        ...(copyImage !== undefined
            ? [
                  {
                      handler: copyImage,
                      icon: 'photo_library',
                      label: t('messaging.action--message-option-copy-image', 'Copy Image'),
                  },
              ]
            : []),
        ...(copy !== undefined
            ? [
                  {
                      handler: copy,
                      icon: 'content_copy',
                      label: t('messaging.action--message-option-copy', 'Copy Message'),
                  },
              ]
            : []),
        ...(saveAsFile !== undefined
            ? [
                  {
                      handler: saveAsFile,
                      icon: 'download',
                      label: t('messaging.action--message-option-save-as-file', 'Save as File'),
                  },
              ]
            : []),
        ...(copyLink !== undefined ||
        copyImage !== undefined ||
        copySelection !== undefined ||
        copy !== undefined ||
        saveAsFile !== undefined
            ? (['divider'] as const)
            : []),
        ...(acknowledge?.handler !== undefined
            ? ([
                  {
                      color: 'acknowledged',
                      filled: acknowledge.filled,
                      handler: acknowledge.handler,
                      icon: 'thumb_up',
                      label: t('messaging.action--message-option-agree', 'Agree'),
                  },
              ] as const)
            : []),
        ...(decline?.handler !== undefined
            ? ([
                  {
                      color: 'declined',
                      filled: decline.filled,
                      handler: decline.handler,
                      icon: 'thumb_down',
                      label: t('messaging.action--message-option-disagree', 'Disagree'),
                  },
              ] as const)
            : []),
        ...(acknowledge?.handler !== undefined || decline?.handler !== undefined
            ? (['divider'] as const)
            : []),
        ...(quote !== undefined
            ? [
                  {
                      handler: quote,
                      icon: 'format_quote',
                      label: t('messaging.action--message-option-quote', 'Quote'),
                  },
              ]
            : []),
        ...(forward !== undefined
            ? [
                  {
                      handler: forward,
                      icon: 'forward',
                      label: t('messaging.action--message-option-forward', 'Forward'),
                  },
              ]
            : []),
        ...(openDetails !== undefined
            ? [
                  {
                      handler: openDetails,
                      icon: 'info',
                      label: t('messaging.action--message-option-details', 'Message Details'),
                  },
              ]
            : []),
        ...(deleteMessage !== undefined
            ? [
                  {
                      handler: deleteMessage,
                      icon: 'delete',
                      label: t('messaging.action--message-option-delete', 'Delete'),
                  },
              ]
            : []),
    ];
}