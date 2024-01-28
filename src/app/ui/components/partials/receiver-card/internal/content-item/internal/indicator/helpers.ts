import type {IndicatorProps} from '~/app/ui/components/partials/receiver-card/internal/content-item/internal/indicator/props';

interface IndicatorElement {
    icon: string;
    color?: 'acknowledged' | 'declined' | 'error';
}

/**
 * Returns a list of indicator elements to display.
 */
export function getIndicatorElement(
    reactions: IndicatorProps['reactions'],
    receiverType: IndicatorProps['conversation']['receiver']['type'],
    status: IndicatorProps['status'],
    options: NonNullable<IndicatorProps['options']> = {},
): IndicatorElement | undefined {
    if (receiverType === 'group') {
        return {
            icon: 'group',
        };
    }

    const reactionElement = getIndicatorElementForReactions(reactions);
    if (reactionElement !== undefined) {
        return reactionElement;
    }

    if (options.hideStatus === true) {
        return undefined;
    }

    return getIndicatorElementForStatus(status);
}

function getIndicatorElementForReactions(
    reactions: IndicatorProps['reactions'] = [],
): IndicatorElement | undefined {
    const {hasInboundAcknowledge, hasInboundDecline, hasOutboundAcknowledge, hasOutboundDecline} =
        reactions.reduce(
            (acc, curr) => ({
                hasInboundAcknowledge:
                    (curr.direction === 'inbound' && curr.type === 'acknowledged') ||
                    acc.hasInboundAcknowledge,
                hasInboundDecline:
                    (curr.direction === 'inbound' && curr.type === 'declined') ||
                    acc.hasInboundDecline,
                hasOutboundAcknowledge:
                    (curr.direction === 'outbound' && curr.type === 'acknowledged') ||
                    acc.hasOutboundAcknowledge,
                hasOutboundDecline:
                    (curr.direction === 'outbound' && curr.type === 'declined') ||
                    acc.hasOutboundDecline,
            }),
            {
                hasInboundAcknowledge: false,
                hasInboundDecline: false,
                hasOutboundAcknowledge: false,
                hasOutboundDecline: false,
            },
        );

    switch (true) {
        case hasInboundAcknowledge:
            return {
                icon: 'thumb_up',
                color: 'acknowledged',
            };

        case hasInboundDecline:
            return {
                icon: 'thumb_down',
                color: 'declined',
            };

        case hasOutboundAcknowledge:
            return {
                icon: 'reply',
                color: 'acknowledged',
            };

        case hasOutboundDecline:
            return {
                icon: 'reply',
                color: 'declined',
            };

        default:
            // No reaction to display.
            return undefined;
    }
}

function getIndicatorElementForStatus(
    status: IndicatorProps['status'],
): IndicatorElement | undefined {
    if (status.error !== undefined) {
        return {
            icon: 'report_problem',
            color: 'error',
        };
    }
    if (status.read !== undefined) {
        return {
            icon: 'visibility',
        };
    }
    if (status.delivered !== undefined) {
        return {
            icon: 'move_to_inbox',
        };
    }
    if (status.sent !== undefined) {
        return {
            icon: 'email',
        };
    }
    if (status.received !== undefined) {
        return undefined;
    }

    return {
        icon: 'file_upload',
    };
}
