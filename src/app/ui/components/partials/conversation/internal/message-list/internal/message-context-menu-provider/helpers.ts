import type {
    ContextMenuItem,
    ContextMenuOption,
} from '~/app/ui/components/hocs/context-menu-provider/types';
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

type ContextMenuItemHandler = ContextMenuOption['handler'];

/**
 * Get the appropriate context menu options for a specific message configuration.
 */
export function getContextMenuItems({
    copyLink,
    copyImage,
    copySelection,
    copy,
    edit,
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
    edit?: {
        disabled?: boolean | 'pseudo';
        handler: ContextMenuItemHandler;
    };
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
}): readonly ContextMenuItem[] {
    return [
        ...(copySelection !== undefined
            ? [
                  {
                      type: 'option',
                      handler: copySelection,
                      icon: {name: 'subject'},
                      label: t('messaging.action--message-option-copy-selection', 'Copy Selection'),
                  } as const,
              ]
            : []),
        ...(copyLink !== undefined
            ? [
                  {
                      type: 'option',
                      handler: copyLink,
                      icon: {name: 'link'},
                      label: t('messaging.action--message-option-copy-link', 'Copy Link'),
                  } as const,
              ]
            : []),
        ...(copyImage !== undefined
            ? [
                  {
                      type: 'option',
                      handler: copyImage,
                      icon: {name: 'photo_library'},
                      label: t('messaging.action--message-option-copy-image', 'Copy Image'),
                  } as const,
              ]
            : []),
        ...(copy !== undefined
            ? [
                  {
                      type: 'option',
                      handler: copy,
                      icon: {name: 'content_copy'},
                      label: t('messaging.action--message-option-copy', 'Copy Message'),
                  } as const,
              ]
            : []),
        ...(saveAsFile !== undefined
            ? [
                  {
                      type: 'option',
                      handler: saveAsFile,
                      icon: {name: 'download'},
                      label: t('messaging.action--message-option-save-as-file', 'Save as File'),
                  } as const,
              ]
            : []),
        ...(copyLink !== undefined ||
        copyImage !== undefined ||
        copySelection !== undefined ||
        copy !== undefined ||
        saveAsFile !== undefined
            ? ([
                  {
                      type: 'divider',
                  },
              ] as const)
            : []),
        ...(acknowledge?.handler !== undefined
            ? ([
                  {
                      type: 'option',
                      handler: acknowledge.handler,
                      icon: {name: 'thumb_up', color: 'acknowledged', filled: acknowledge.filled},
                      label: t('messaging.action--message-option-agree', 'Agree'),
                  } as const,
              ] as const)
            : []),
        ...(decline?.handler !== undefined
            ? ([
                  {
                      type: 'option',
                      handler: decline.handler,
                      icon: {name: 'thumb_down', color: 'declined', filled: decline.filled},
                      label: t('messaging.action--message-option-disagree', 'Disagree'),
                  } as const,
              ] as const)
            : []),
        ...(acknowledge?.handler !== undefined || decline?.handler !== undefined
            ? ([
                  {
                      type: 'divider',
                  },
              ] as const)
            : []),
        ...(quote !== undefined
            ? [
                  {
                      type: 'option',
                      handler: quote,
                      icon: {name: 'format_quote'},
                      label: t('messaging.action--message-option-quote', 'Quote'),
                  } as const,
              ]
            : []),
        ...(forward !== undefined
            ? [
                  {
                      type: 'option',
                      handler: forward,
                      icon: {name: 'forward'},
                      label: t('messaging.action--message-option-forward', 'Forward'),
                  } as const,
              ]
            : []),
        ...(edit !== undefined
            ? [
                  {
                      type: 'option',
                      disabled: edit.disabled,
                      handler: edit.handler,
                      icon: {name: 'edit'},
                      label: t('messaging.action--message-option-edit', 'Edit'),
                  } as const,
              ]
            : []),
        ...(deleteMessage !== undefined
            ? [
                  {
                      type: 'option',
                      handler: deleteMessage,
                      icon: {name: 'delete'},
                      label: t('messaging.action--message-option-delete', 'Delete'),
                  } as const,
              ]
            : []),
        ...(openDetails !== undefined
            ? [
                  {
                      type: 'option',
                      handler: openDetails,
                      icon: {name: 'info'},
                      label: t('messaging.action--message-option-details', 'Message Details'),
                  } as const,
              ]
            : []),
    ];
}
