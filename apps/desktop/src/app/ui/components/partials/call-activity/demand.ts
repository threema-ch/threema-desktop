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
 * Aggregates how large each remote feed is currently displayed, and turns that into subscription
 * intents for the SFU.
 */
export interface RemoteDemand {
    /**
     * Reports how large a remote feed is currently displayed, in CSS pixels, or `undefined` if it
     * is not visible to the user at all.
     */
    readonly report: (
        kind: RemoteDemandKind,
        participantId: ParticipantId,
        size: Dimensions | undefined,
    ) => void;
    /**
     * Forgets every reported size, e.g. because the call ended. Note: Does not unsubscribe, because
     * there is nothing left to unsubscribe from.
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
    /**
     * The size in CSS pixels, kept so that the resolution can be recalculated when the device pixel
     * ratio changes without the feed being resized.
     */
    readonly size: Dimensions;
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
     * The most recent report per feed, i.e. everything which is currently subscribed.
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
        size: Dimensions | undefined,
    ): void {
        const key = `${kind}-${participantId}`;

        // Skip the report if the size is still the same as in the last report.
        const reported = reports.get(key)?.size;
        if (size?.height === reported?.height && size?.width === reported?.width) {
            return;
        }

        if (size === undefined) {
            reports.delete(key);
        } else {
            reports.set(key, {kind, participantId, size});
        }
        const resolution = size === undefined ? undefined : cssSizeToDevicePixelSize(size);

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
            emit(key, current.kind, current.participantId, cssSizeToDevicePixelSize(current.size));
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
