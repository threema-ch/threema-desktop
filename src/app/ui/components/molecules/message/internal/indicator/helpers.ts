import type {IndicatorProps} from '~/app/ui/components/molecules/message/internal/indicator/props';
import type {u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

interface IndicatorElement {
    icon: string;
    color?: 'acknowledged' | 'declined' | 'error';
    count?: u53;
    filled?: boolean;
}

/**
 * Returns a list of indicator elements to display.
 */
export function getIndicatorElements(
    direction: IndicatorProps['direction'],
    hideStatus: NonNullable<IndicatorProps['hideStatus']>,
    reactions: IndicatorProps['reactions'],
    status: IndicatorProps['status'],
): IndicatorElement[] {
    const reactionElements = getIndicatorElementsForReactions(reactions);
    if (reactionElements.length === 0 && direction === 'inbound') {
        return [];
    }
    if (reactionElements.length > 0) {
        return reactionElements;
    }

    if (hideStatus) {
        return [];
    }

    const statusElement = getIndicatorElementForStatus(status);
    if (statusElement !== undefined) {
        return [statusElement];
    }

    return [];
}

function getIndicatorElementsForReactions(
    reactions: IndicatorProps['reactions'] = [],
): IndicatorElement[] {
    const elements: IndicatorElement[] = [];

    let hasOutboundAcknowledge = false;
    let hasOutboundDecline = false;
    let inboundAcknowledgeCount = 0;
    let inboundDeclineCount = 0;
    for (const reaction of reactions) {
        switch (reaction.direction) {
            case 'inbound':
                switch (reaction.type) {
                    case 'acknowledged':
                        inboundAcknowledgeCount += 1;
                        break;

                    case 'declined':
                        inboundDeclineCount += 1;
                        break;

                    default:
                        unreachable(reaction.type);
                }
                break;

            case 'outbound':
                switch (reaction.type) {
                    case 'acknowledged':
                        hasOutboundAcknowledge = true;
                        break;

                    case 'declined':
                        hasOutboundDecline = true;
                        break;

                    default:
                        unreachable(reaction.type);
                }
                break;

            default:
                unreachable(reaction.direction);
        }
    }

    if (hasOutboundAcknowledge || inboundAcknowledgeCount > 0) {
        elements.push({
            icon: 'thumb_up',
            color: 'acknowledged',
            count: inboundAcknowledgeCount > 0 ? inboundAcknowledgeCount : undefined,
            filled: true, // TODO(DESK-594): Use "hasOutboundAcknowledge" instead
        });
    }

    if (hasOutboundDecline || inboundDeclineCount > 0) {
        elements.push({
            icon: 'thumb_down',
            color: 'declined',
            count: inboundDeclineCount > 0 ? inboundDeclineCount : undefined,
            filled: true, // TODO(DESK-594): Use "hasOutboundDecline" instead
        });
    }

    return elements;
}

function getIndicatorElementForStatus(
    status: IndicatorProps['status'],
): IndicatorElement | undefined {
    if (status.error !== undefined) {
        return {
            icon: 'report_problem',
            color: 'error',
            filled: true,
        };
    }
    if (status.read !== undefined) {
        return {
            icon: 'visibility',
            filled: true,
        };
    }
    if (status.delivered !== undefined) {
        return {
            icon: 'move_to_inbox',
            filled: true,
        };
    }
    if (status.sent !== undefined) {
        return {
            icon: 'email',
            filled: true,
        };
    }
    if (status.received !== undefined) {
        return undefined;
    }

    return {
        icon: 'file_upload',
        filled: true,
    };
}
