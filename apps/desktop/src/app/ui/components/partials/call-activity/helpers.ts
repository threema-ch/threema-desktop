import type {AppServicesForSvelte} from '~/app/types';
import {
    transformOngoingGroupCallProps,
    type AugmentedOngoingGroupCallViewModelBundle,
} from '~/app/ui/components/partials/call-activity/transformer';
import type {I18nType} from '~/app/ui/i18n-types';
import type {Logger} from '~/common/logging';
import {assert, unreachable, unwrap} from '~/common/utils/assert';
import type {Remote} from '~/common/utils/endpoint';
import type {AbortRaiser} from '~/common/utils/signal';
import type {ConversationViewModelBundle} from '~/common/viewmodel/conversation/main';
import type {AnyGroupCallContextAbort} from '~/common/webrtc/group-call';

export type AnyAugmentedOngoingCallViewModelBundle = AugmentedOngoingGroupCallViewModelBundle;

/**
 * Join a group call, or create one and join it.
 *
 * @returns The call which was joined, or `undefined` if the intent was to join a call which is no
 *   longer running.
 */
export async function startCall(
    services: Pick<AppServicesForSvelte, 'webRtc'>,
    log: Logger,
    conversation: Remote<ConversationViewModelBundle>,
    intent: 'join' | 'join-or-create',
    stop: AbortRaiser<AnyExtendedGroupCallContextAbort>,
): Promise<AugmentedOngoingGroupCallViewModelBundle | undefined> {
    // Start group call.
    log.debug(`Starting group call (intent=${intent}}`);
    let ongoing;
    switch (intent) {
        case 'join':
            ongoing = await unwrap(conversation.viewModelController).group.joinCall(stop.listener);
            break;

        case 'join-or-create':
            ongoing = await unwrap(conversation.viewModelController).group.joinOrCreateCall(
                stop.listener,
            );
            break;

        default:
            unreachable(intent);
    }
    if (ongoing === undefined) {
        assert(intent === 'join');
        return undefined;
    }
    const call = await transformOngoingGroupCallProps(services.webRtc, ongoing);
    log.debug('Group call started');

    // Forward aborts coming from outside of the component.
    call.abort.forward(stop, (event) => event);

    return call;
}

export type AnyExtendedGroupCallContextAbort =
    | AnyGroupCallContextAbort
    | {
          readonly origin: 'ui-component';
          readonly cause: 'destroy' | 'switching-call' | 'user-hangup' | 'unexpected-error';
      };

/**
 * What to tell the user about a call which ended, or `undefined` if the reason needs no
 * explanation.
 */
export function getToastForAbortEvent(
    i18n: I18nType,
    event: AnyExtendedGroupCallContextAbort,
): {readonly text: string; readonly isFailure: boolean} | undefined {
    switch (event.cause) {
        case 'disconnected':
            return {
                text: i18n.t(
                    'messaging.error--call-disconnected',
                    'Call ended because the connection was interrupted',
                ),
                isFailure: true,
            };

        case 'group-left-kicked-or-removed':
            return {
                text: i18n.t(
                    'messaging.error--call-group-left-kicked-or-removed',
                    'Group call ended because you left the group',
                ),
                isFailure: true,
            };

        case 'group-calls-disabled':
            return {
                text: i18n.t(
                    'messaging.error--call-group-calls-disabled',
                    'Group calls are disabled',
                ),
                isFailure: true,
            };

        case 'call-not-running':
            return {
                text: i18n.t('messaging.error--call-not-running', 'Call has already ended'),
                isFailure: true,
            };

        case 'call-full':
            return {
                text: i18n.t(
                    'messaging.error--call-group-full',
                    'Maximum reached: No more participants can join this group call',
                ),
                isFailure: true,
            };

        case 'unexpected-error':
            // Generic, unknown errors.
            return {
                text: i18n.t(
                    'messaging.error--call-unexpected-error',
                    'Call ended due to an unexpected error',
                ),
                isFailure: true,
            };

        case 'disconnected-due-to-inactivity':
            return {
                text: i18n.t(
                    'messaging.error--call-disconnected-due-to-inactivity',
                    'Call ended due to inactivity',
                ),
                isFailure: false,
            };

        case 'destroy':
            // The component which hosted the call was destroyed, so the user only needs to be told
            // that the call is over.
            return {
                text: i18n.t('messaging.hint--call-ended', 'Call ended'),
                isFailure: false,
            };

        case 'user-hangup':
        case 'switching-call':
            // Regular, expected events, which the user does not need to be told about.
            return undefined;

        default:
            return unreachable(event);
    }
}
