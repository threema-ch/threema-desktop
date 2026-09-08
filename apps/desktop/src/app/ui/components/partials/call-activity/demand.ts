import type {u53} from '@threema/ts-utils/integer/u53';
import {isShallowEqual} from '@threema/ts-utils/object/is-shallow-equal';
import {TIMER} from '@threema/ts-utils/timer/global-timer';

import {
    getDevicePixelRatio,
    subscribeToDevicePixelRatio,
} from '~/app/ui/components/partials/call-activity/device-pixel-ratio';
import type {ParticipantId} from '~/common/network/protocol/call/group-call';
import type {Dimensions} from '~/common/types';

/**
 * How long reports are collected before the resulting intents are sent, so that resizing a window
 * does not flood the SFU with subscription changes.
 */
const BATCH_MS = 500;

/**
 * Which of a participant's feeds a demand refers to.
 */
export type RemoteDemandKind = 'camera' | 'screen';

/**
 * Properties of a feed which influence the {@link RemoteDemand}.
 */
interface RemoteFeedPresentation {
    readonly isExpanded: boolean;
    readonly isFullscreen: boolean;
    readonly isPictureInPicture: boolean;
    readonly isVisible: boolean;
    readonly size: Dimensions | undefined;
}

/**
 * The maximum width allowed to be requested, if the feed is not the primary feed (i.e., it's
 * expanded, fullscreen, or similar).
 */
const MAX_SECONDARY_WIDTH_PX: Record<RemoteDemandKind, u53> = {
    camera: 640,
    screen: 480,
};

/**
 * Aggregates how each remote feed is presented, and turns that into subscription intents for the
 * SFU.
 */
export interface RemoteDemand {
    /**
     * Reports how a remote feed is currently presented to the user.
     */
    readonly report: (
        kind: RemoteDemandKind,
        participantId: ParticipantId,
        presentation: RemoteFeedPresentation,
    ) => void;
    /**
     * Forgets every report, e.g. because the call ended. Note: Does not unsubscribe, because there
     * is nothing left to unsubscribe from.
     */
    readonly reset: () => void;
    /**
     * Stops watching the device pixel ratio.
     */
    readonly close: () => void;
}

interface Report {
    readonly kind: RemoteDemandKind;
    readonly participantId: ParticipantId;
    readonly presentation: RemoteFeedPresentation;
}

/**
 * The resolution to ask the SFU for, in device pixels.
 */
function cssSizeToDevicePixelSize(size: Dimensions): Dimensions {
    const ratio = getDevicePixelRatio();
    return {
        height: Math.round(size.height * ratio),
        width: Math.round(size.width * ratio),
    };
}

/**
 * Calculates the remote resolution to ask for, which may be lower than the actual size of the
 * rendered feed. The primary feed's resolution is prioritized.
 */
function getResolutionRequest(
    kind: RemoteDemandKind,
    presentation: RemoteFeedPresentation,
): Dimensions | undefined {
    if (!presentation.isVisible || presentation.size === undefined) {
        return undefined;
    }
    const resolution = cssSizeToDevicePixelSize(presentation.size);

    if (presentation.isExpanded || presentation.isFullscreen || presentation.isPictureInPicture) {
        return resolution;
    }

    const max = MAX_SECONDARY_WIDTH_PX[kind];
    if (resolution.width <= max) {
        return resolution;
    }
    // Maintain the original aspect ratio even if the size is clamped.
    return {
        height: Math.round((resolution.height * max) / resolution.width),
        width: max,
    };
}

/**
 * Create a {@link RemoteDemand}.
 *
 * @param onintent Called with the resolution to subscribe to, or `undefined` to unsubscribe. Note:
 *   May be called after the call it belongs to has ended, because reports are batched, so it must
 *   tolerate there being no call left.
 */
export function createRemoteDemand(
    onintent: (
        kind: RemoteDemandKind,
        participantId: ParticipantId,
        resolution: Dimensions | undefined,
    ) => void,
): RemoteDemand {
    /**
     * The most recent report per feed.
     */
    const reports = new Map<string, Report>();
    /**
     * Feeds an intent was sent for, so that a feed which was not asked for yet can be subscribed
     * without waiting for the batch window.
     */
    const sent = new Set<string>();

    function emit(
        key: string,
        kind: RemoteDemandKind,
        participantId: ParticipantId,
        resolution: Dimensions | undefined,
    ): void {
        if (resolution === undefined) {
            sent.delete(key);
        } else {
            sent.add(key);
        }
        onintent(kind, participantId, resolution);
    }

    const emitBatched = TIMER.debounceWithDistinctArgs(emit, BATCH_MS, (key) => key, false);

    function report(
        kind: RemoteDemandKind,
        participantId: ParticipantId,
        presentation: RemoteFeedPresentation,
    ): void {
        const key = `${kind}-${participantId}`;

        // Skip the report if the feed is still presented the same as in the last report.
        if (isShallowEqual(reports.get(key)?.presentation, presentation)) {
            return;
        }

        // Note: Kept even for a feed which is not to be subscribed.
        reports.set(key, {kind, participantId, presentation});
        const resolution = getResolutionRequest(kind, presentation);

        // A feed which nothing was asked for yet is one which just appeared or just became visible,
        // so it is subscribed right away rather than a batch window later. Waiting would mean the
        // user stares at an empty tile for half a second on every join.
        if (sent.has(key)) {
            emitBatched(key, kind, participantId, resolution);
        } else {
            emit(key, kind, participantId, resolution);
        }
    }

    const unsubscribe = subscribeToDevicePixelRatio(() => {
        // Every subscribed resolution is now wrong by the same factor. Sent immediately, because a
        // ratio change is a rare, one-off event.
        for (const [key, current] of reports.entries()) {
            const resolution = getResolutionRequest(current.kind, current.presentation);
            if (resolution !== undefined) {
                emit(key, current.kind, current.participantId, resolution);
            }
        }
    });

    return {
        report,
        reset: () => {
            reports.clear();
            sent.clear();
        },
        close: unsubscribe,
    };
}
