import type {IndicatorProps} from '~/app/ui/components/molecules/message/internal/indicator/props';
import type {u53} from '~/common/types';
import {unreachable} from '~/common/utils/assert';

interface IndicatorElement {
    icon: string;
    color?: 'acknowledged' | 'declined' | 'error';
    count?: u53;
    filled?: boolean;
    title?: string;
}

/**
 * Returns a list of indicator elements to display.
 */
export function getIndicatorElements(
    direction: IndicatorProps['direction'],
    options: NonNullable<IndicatorProps['options']>,
    reactions: IndicatorProps['reactions'],
    status: IndicatorProps['status'],
): IndicatorElement[] {
    const reactionElements = getIndicatorElementsForReactions(reactions, options);
    if (reactionElements.length === 0 && direction === 'inbound') {
        return [];
    }
    if (reactionElements.length > 0) {
        return reactionElements;
    }

    if (options.hideStatus === true) {
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
    options: Pick<NonNullable<IndicatorProps['options']>, 'fillReactions' | 'alwaysShowNumber'> = {
        fillReactions: false,
    },
): IndicatorElement[] {
    const elements: IndicatorElement[] = [];

    let hasOutboundAcknowledge = false;
    let hasOutboundDecline = false;
    const acknowledgedBy = [];
    const declinedBy = [];
    for (const reaction of reactions) {
        switch (reaction.direction) {
            case 'inbound':
                switch (reaction.type) {
                    case 'acknowledged':
                        acknowledgedBy.push(reaction.sender.name);
                        break;

                    case 'declined':
                        declinedBy.push(reaction.sender.name);
                        break;

                    default:
                        unreachable(reaction.type);
                }
                break;

            case 'outbound':
                switch (reaction.type) {
                    case 'acknowledged':
                        hasOutboundAcknowledge = true;
                        acknowledgedBy.push(reaction.sender.name);
                        break;

                    case 'declined':
                        hasOutboundDecline = true;
                        declinedBy.push(reaction.sender.name);
                        break;

                    default:
                        unreachable(reaction.type);
                }
                break;

            default:
                unreachable(reaction.direction);
        }
    }

    if (hasOutboundAcknowledge || acknowledgedBy.length > 0) {
        const showTitle = acknowledgedBy.length > 1 || options.alwaysShowNumber === true;
        elements.push({
            icon: 'thumb_up',
            color: 'acknowledged',
            count: acknowledgedBy.length > 0 ? acknowledgedBy.length : undefined,
            filled: hasOutboundAcknowledge || options.fillReactions,
            title: showTitle ? acknowledgedBy.join(', ') : undefined,
        });
    }

    if (hasOutboundDecline || declinedBy.length > 0) {
        const showTitle = declinedBy.length > 1 || options.alwaysShowNumber === true;
        elements.push({
            icon: 'thumb_down',
            color: 'declined',
            count: declinedBy.length > 0 ? declinedBy.length : undefined,
            filled: hasOutboundDecline || options.fillReactions,
            title: showTitle ? declinedBy.join(', ') : undefined,
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
