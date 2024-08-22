import type {PublicKey} from '~/common/crypto';
import {
    deriveGroupCallProperties,
    wrapRawGroupCallKey,
    type GroupCallKeyDerivations,
    type RawGroupCallKey,
} from '~/common/crypto/group-call';
import type {DbCreate, DbRunningGroupCall} from '~/common/db';
import {
    GroupCallPolicy,
    GroupUserState,
    GroupUserStateUtils,
    StatusMessageType,
    TransferTag,
} from '~/common/enum';
import {BaseError, type BaseErrorOptions} from '~/common/error';
import {TRANSFER_HANDLER} from '~/common/index';
import type {Logger} from '~/common/logging';
import type {Contact, Group, ServicesForModel} from '~/common/model';
import {OngoingGroupCall} from '~/common/model/group-call';
import type {ModelStore} from '~/common/model/utils/model-store';
import type {JoinResponse} from '~/common/network/protobuf/validate/group-call';
import type {AnyOngoingCall, CallType} from '~/common/network/protocol/call';
import {
    DirectoryError,
    type DirectoryErrorType,
    type SfuToken,
} from '~/common/network/protocol/directory';
import {ensureBaseUrl, type BaseUrl, type IdentityString} from '~/common/network/types';
import {tag, type ReadonlyUint8Array, type WeakOpaque, type u16, type u53} from '~/common/types';
import {assert, assertUnreachable, unreachable} from '~/common/utils/assert';
import {byteEquals, bytesToHex} from '~/common/utils/byte';
import {PROXY_HANDLER, registerErrorTransferHandler} from '~/common/utils/endpoint';
import {AsyncLock} from '~/common/utils/lock';
import {clamp} from '~/common/utils/number';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {AbortRaiser, type AbortListener} from '~/common/utils/signal';
import {type IQueryableStore, WritableStore} from '~/common/utils/store';
import {TIMER, type TimerCanceller} from '~/common/utils/timer';
import {MIDS_MAX, type AnyGroupCallContextAbort, GroupCall} from '~/common/webrtc/group-call';

export type ServicesForGroupCall = Pick<
    ServicesForModel,
    'db' | 'crypto' | 'device' | 'directory' | 'endpoint' | 'logging' | 'model' | 'sfu' | 'webrtc'
>;

/**
 * Error types associated to a group call.
 *
 * - invalid-state: The call state machine is in a state that did not allow for the desired action.
 * - directory-error: Could not acquire an SFU token.
 * - sfu-timeout: The SFU endpoint did not respond in time.
 * - sfu-fetch: An error occurred when fetching data from the SFU (e.g. a network connectivity
 *   error).
 * - sfu-status-code: The SFU endpoint did not return an acceptable HTTP status code for the call.
 * - sfu-invalid-data: Data received from the SFU endpoint that is considered critical could not be
 *   decoded.
 * - webrtc-connect: Could not connect to the SFU via WebRTC.
 */
export type GroupCallErrorType =
    | {readonly kind: 'invalid-state'}
    | {readonly kind: 'directory-error'; readonly type: DirectoryErrorType}
    | {readonly kind: 'sfu-timeout'}
    | {readonly kind: 'sfu-fetch'}
    | {readonly kind: 'sfu-status-code'; readonly status: u53}
    | {readonly kind: 'sfu-invalid-data'}
    | {readonly kind: 'webrtc-connect'};

const GROUP_CALL_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    GroupCallError,
    TransferTag.GROUP_CALL_ERROR,
    [type: GroupCallErrorType]
>({
    tag: TransferTag.GROUP_CALL_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new GroupCallError(type, message, {from: cause}),
});

export class GroupCallError extends BaseError {
    public [TRANSFER_HANDLER] = GROUP_CALL_ERROR_TRANSFER_HANDLER;
    public constructor(
        public readonly type: GroupCallErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}

/** Group Call ID value in hex. */
export type GroupCallIdValue = WeakOpaque<string, {readonly GroupCallIdValue: unique symbol}>;

/** A valid Group Call ID is the output of Blake2b hash with 32 bytes length. */
export interface GroupCallId {
    readonly bytes: ReadonlyUint8Array;
    readonly id: GroupCallIdValue;
    readonly shortened: string;
}
export function createGroupCallId(bytes: ReadonlyUint8Array): GroupCallId {
    if (bytes.byteLength !== 32 || bytes.every((byte) => byte === 0)) {
        throw Error('Not a valid group call id');
    }
    const id = tag<GroupCallIdValue>(bytesToHex(bytes, ''));
    return {
        bytes,
        id,
        shortened: `${id.slice(0, 4)}..${id.slice(-4)}`,
    };
}

/** A valid Participant ID is [0, 790[ due to the way we map MIDs. */
export type ParticipantId = WeakOpaque<u16, {readonly ParticipantId: unique symbol}>;
export function isParticipantId(value: u53): value is ParticipantId {
    return value >= 0 && value < MIDS_MAX;
}
export function ensureParticipantId(value: u53): ParticipantId {
    if (!isParticipantId(value)) {
        throw Error(`Not a valid participant id: '${value}'`);
    }
    return value;
}

/**
 * Return the {@link ModelStore<Contact> | 'me'} and the associated {@link PublicKey} if the
 * provided identity is the user or any other member of the group.
 *
 * Note: Because the user does not have a {@link Contact} model but can participate (multiple times)
 * in the group call, we'll need to make a special check for it first. If the user is currently not
 * a member of the group, this will intentionally return `undefined`.
 */
export function getGroupMember(
    services: Pick<ServicesForGroupCall, 'device' | 'model'>,
    group: Group,
    identity: IdentityString,
): {readonly contact: ModelStore<Contact> | 'me'; readonly publicKey: PublicKey} | undefined {
    let contact: ModelStore<Contact> | 'me' | undefined;
    let publicKey;
    if (identity === services.device.identity.string) {
        contact = 'me';
        publicKey = services.device.csp.ck.public;
    } else {
        contact = services.model.contacts.getByIdentity(identity);
        if (contact === undefined) {
            return undefined;
        }
        publicKey = contact.get().view.publicKey;
    }
    if (!group.controller.hasMember(contact)) {
        return undefined;
    }
    return {contact, publicKey};
}

export interface GroupCallBaseData {
    /** The associated group model store. */
    readonly group: ModelStore<Group>;
    /** Identity of the group member that started the group call. */
    readonly startedBy: IdentityString;
    // TODO(DESK-1466): At risk, rather use reflected-at (outgoing), created-at (incoming)
    /** When this _base_ data was received (or created, when the call was created by the user). */
    readonly receivedAt: Date;
    /** Protocol version used in the announcement. */
    readonly protocolVersion: u53;
    /** Group Call Key (GCK) used for the call. */
    readonly gck: RawGroupCallKey;
    /** SFU base URL to make _peek_ and _join_ calls to. */
    readonly sfuBaseUrl: {
        readonly raw: string;
        readonly parsed: BaseUrl;
    };
    /** All essential derivations from GCK. */
    readonly derivations: GroupCallKeyDerivations;
}

export interface GroupCallStateSnapshot {
    readonly startedAt: Date;
    readonly maxParticipants: u53;
    /** IMPORTANT: This may include contacts more than once, including the user itself! */
    readonly participants: readonly (ModelStore<Contact> | 'me')[] | undefined;
}

interface GroupCallState {
    /**
     * The user either started a group call or the `GroupCallStart` was just received but we
     * haven't peeked the call yet.
     */
    readonly init: {
        readonly type: 'init';
    };

    /** Peeking the call failed. */
    readonly failed: {
        readonly type: 'failed';

        /** Number of consecutive failed peek attempts. */
        readonly nFailed: u53;
    };

    /** Peeking the call was successful. */
    readonly peeked: {
        readonly type: 'peeked';

        /** Peeked state. */
        readonly state: GroupCallStateSnapshot;
    };

    /** Peeking the call was unnecessary because the user currently participates in it. */
    readonly ongoing: {
        readonly type: 'ongoing';

        /** Associated call instance. */
        readonly call: OngoingGroupCall;
    };
}

export type RunningGroupCall<TType extends keyof GroupCallState = keyof GroupCallState> = {
    readonly base: GroupCallBaseData;
} & GroupCallState[TType];

function serializeRunningGroupCall(call: RunningGroupCall): DbCreate<DbRunningGroupCall> {
    const {type} = call;
    return {
        gck: call.base.gck,
        groupUid: call.base.group.get().ctx,
        nFailed: type !== 'failed' ? 0 : call.nFailed,
        protocolVersion: call.base.protocolVersion,
        baseUrl: call.base.sfuBaseUrl.raw,
        receivedAt: call.base.receivedAt,
        creatorIdentity: call.base.startedBy,
    };
}

export function deserializeRunningGroupCall(
    services: Pick<ServicesForModel, 'crypto' | 'device'>,
    group: ModelStore<Group>,
    call: Omit<DbRunningGroupCall, 'uid'>,
): RunningGroupCall<'init' | 'failed'> {
    const init = {
        startedBy: call.creatorIdentity,
        receivedAt: call.receivedAt,
        protocolVersion: call.protocolVersion,
        gck: call.gck,
        sfuBaseUrl: {
            raw: call.baseUrl,
            parsed: ensureBaseUrl(call.baseUrl, 'https:'),
        },
    };
    const base: GroupCallBaseData = {
        ...init,
        group,
        derivations: deriveGroupCallProperties(services, group.get().view, init),
    };
    if (call.nFailed === 0) {
        return {type: 'init', base};
    }
    return {type: 'failed', nFailed: call.nFailed, base};
}

/** Contains all properties of a group call considered _running_ and _chosen_. */
export type ChosenGroupCall = RunningGroupCall<'peeked' | 'ongoing'>;

type GroupCallRunningContextAbort =
    | 'no-call-running'
    | 'group-left-kicked-or-removed'
    | 'unexpected-error';

/**
 * This context exists when there is at least one group call considered _running_. It can be created
 * by either starting a group call ourselves or by receiving a `GroupCallStart` message from another
 * group member.
 *
 * The context will run the _Group Call Refresh Steps_ periodically (or on request) and will shut
 * down itself when there no longer is a group call considered running.
 */
class GroupCallRunningContext {
    private readonly _log: Logger;
    private readonly _lock = new AsyncLock<'refresh' | 'group-update'>();

    private readonly _running = new WritableStore<Map<GroupCallIdValue, RunningGroupCall>>(
        new Map(),
    );
    private _cancel: TimerCanceller | undefined = undefined;

    public constructor(
        private readonly _services: ServicesForGroupCall,
        private readonly _ongoing: IQueryableStore<AnyOngoingCall>,
        private readonly _group: {
            readonly store: ModelStore<Group>;
            readonly chosen: WritableStore<ChosenGroupCall | undefined>;
        },
        private readonly _abort: AbortRaiser<GroupCallRunningContextAbort>,
    ) {
        this._log = _services.logging.logger(`group-call-running.${_group.store.ctx}`);

        // Write running group calls to database whenever there's a change
        _abort.subscribe(
            this._running.subscribe((running) => {
                if (import.meta.env.VERBOSE_LOGGING.CALLS) {
                    this._log.debug('Writing group calls to database', running);
                }
                this._services.db.storeRunningGroupCalls(
                    this._group.store.ctx,
                    [...running.values()].map((call) => serializeRunningGroupCall(call)),
                );
            }),
        );

        // Abort the context when the user is no longer a member of the group or the group has been
        // removed entirely.
        _abort.subscribe(
            _group.store.subscribe(({view, controller}) => {
                // Check if the group has been removed
                if (!controller.lifetimeGuard.active.get()) {
                    _abort.raise('group-left-kicked-or-removed');
                }

                // Check if we have left or been removed from the group
                if (view.userState !== GroupUserState.MEMBER) {
                    _abort.raise('group-left-kicked-or-removed');
                }

                // Remove participants from any of the group calls considered _running_ which are no
                // longer a member of the group.
                //
                // Note: This won't update _running_ calls which are also _ongoing_ as those are
                // directly updated from the ongoing `GroupCall` instance.
                const update = (
                    call: RunningGroupCall,
                ): readonly [GroupCallIdValue, RunningGroupCall] => {
                    if (call.type !== 'peeked') {
                        return [call.base.derivations.callId.id, call];
                    }
                    if (call.state.participants === undefined) {
                        return [call.base.derivations.callId.id, call];
                    }

                    // Filter removed participants.
                    //
                    // Note: Newly added participants which have been filtered
                    // beforehand (e.g. due to a race with the member joining the
                    // call and the user receiving a `group-setup`) would be picked
                    // up in the subsequent next refresh. A delay of 10s is deemed
                    // acceptable.
                    const participants = call.state.participants.filter((participant) =>
                        controller.hasMember(participant),
                    );
                    const updated: RunningGroupCall<'peeked'> = {
                        type: 'peeked',
                        base: call.base,
                        state: {
                            ...call.state,
                            participants,
                        },
                    };

                    // Update chosen store if this _running_ call is also _chosen_.
                    if (
                        this._group.chosen.run((chosen) => {
                            if (chosen === undefined) {
                                return false;
                            }
                            return byteEquals(
                                chosen.base.derivations.callId.bytes,
                                call.base.derivations.callId.bytes,
                            );
                        })
                    ) {
                        this._group.chosen.update(() => updated);
                    }
                    return [updated.base.derivations.callId.id, updated];
                };

                this._lock
                    .with(() => {
                        this._running.update(
                            (running) => new Map([...running.values()].map(update)),
                        );
                    }, 'group-update')
                    .catch(assertUnreachable);
            }),
        );

        // Rerun the refresh steps whenever an ongoing group call ended that affects our group (so
        // we'll need to switch over to _peeking_ again).
        //
        // Note: This is a simplification. We could check whether it actually was a group call and
        // whether it affects our group, but there will only ever be so many calls (1:1 or group),
        // so the extra refresh calls really shouldn't matter.
        _abort.subscribe(
            _ongoing.subscribe((ongoing) => {
                if (ongoing === undefined) {
                    this._lock
                        .with(async () => await this._refresh(undefined), 'refresh')
                        .catch((error: unknown) => {
                            this._log.error('Group call refresh failed', error);
                            this._abort.raise('unexpected-error');
                        });
                }
            }),
        );
    }

    // WARNING: Only call this with `lock` acquired!
    private static async _refreshCall(
        services: ServicesForGroupCall,
        context: {
            readonly ongoing: IQueryableStore<AnyOngoingCall>;
            readonly group: ModelStore<Group>;
        },
        call: RunningGroupCall,
        token: SfuToken,
    ): Promise<
        | {
              readonly type: 'refreshed';
              readonly state: GroupCallState['peeked'] | GroupCallState['ongoing'];
          }
        | {readonly type: 'invalid' | 'ended' | 'failed' | 'timeout'}
    > {
        const log = services.logging.logger(
            `group-call-running.${context.group.ctx}.refresh.${call.base.derivations.callId.shortened}`,
        );

        // Check if it's the ongoing call in which case we already have more accurate information
        // than we'd get from a _peek_.
        //
        // Note: The Call ID is a hash that includes the group identity, so we can simply compare
        // the Call ID to uniquely identify group calls.
        const ongoing = context.ongoing.get();
        if (ongoing?.type === 'group-call') {
            const {ctx} = ongoing.get();
            if (byteEquals(ctx.callId.bytes, call.base.derivations.callId.bytes)) {
                return {
                    type: 'refreshed',
                    state: {type: 'ongoing', call: ongoing},
                };
            }
        }

        // Ensure the SFU base URL ends with one of the _Allowed SFU Hostname Suffixes_.
        //
        // Note 1: We do this here because...
        //
        // 1. Fetching the SFU token before registration may fail but the call would still have to
        //    be considered _running_.
        // 2. Fetching it would make registration async which is a PITA.
        //
        // Note 2: A call is never considered _chosen_ before this validation occurs, so the UI will
        // not display a call and the user is not able to join a call with a disallowed
        // SFU base URL.
        //
        // Note 3: Validating this in every iteration and for calls we have created ourselves is not
        // smart but KISS.
        if (
            !token.allowedSfuHostnameSuffixes.some((allowedSfuHostnameSuffix) =>
                call.base.sfuBaseUrl.parsed.hostname.endsWith(allowedSfuHostnameSuffix),
            )
        ) {
            log.warn(
                `Dropping group call with disallowed SFU base URL '${call.base.sfuBaseUrl.raw}'`,
            );
            return {type: 'invalid'};
        }

        // Peek
        for (let nTries = 0; ; ++nTries) {
            try {
                const state = await services.sfu.peek(call.base, token);
                if (state === undefined) {
                    log.info('Group call no longer considered running');
                    return {type: 'ended'};
                }

                // Map and filter participants with a group membership check
                const participants: GroupCallStateSnapshot['participants'] = state.participants
                    ?.map(
                        (identity) =>
                            getGroupMember(services, context.group.get(), identity)?.contact,
                    )
                    .filter(
                        (participant): participant is NonNullable<typeof participant> =>
                            participant !== undefined,
                    );

                return {
                    type: 'refreshed',
                    state: {
                        type: 'peeked',
                        state: {
                            startedAt: state.startedAt,
                            maxParticipants: state.maxParticipants,
                            participants: participants?.length === 0 ? undefined : participants,
                        },
                    },
                };
            } catch (error) {
                // Check for unexpected error
                if (!(error instanceof GroupCallError)) {
                    log.error('Unexpected error when peeking group call', error);
                    return {type: 'failed'};
                }

                // Check for timeout (this is not considered a failure because we may simply not
                // have a sufficient network connection).
                if (error.type.kind === 'sfu-timeout') {
                    return {type: 'timeout'};
                }

                // Any non status code SFU error is a failure at this point
                if (error.type.kind !== 'sfu-status-code') {
                    return {type: 'failed'};
                }

                // Check if we need to fetch the SFU token again and retry or fail otherwise
                if (error.type.status !== 401) {
                    return {type: 'failed'};
                }
            }

            // Fetch new SFU token and retry (exactly once)
            if (nTries > 0) {
                // Fallthrough case for another failure after re-refetching the SFU token
                return {type: 'failed'};
            }
            try {
                token = await services.directory.sfuToken(
                    services.device.identity.string,
                    services.device.csp.ck,
                );
            } catch (error) {
                const message = 'Unable to re-fetch SFU token from directory for group call';
                log.warn(message, error);
                return {type: 'failed'};
            }
        }
    }

    // WARNING: Only call this with `lock` acquired!
    private static async _refreshGroup(
        services: ServicesForGroupCall,
        context: {
            readonly ongoing: IQueryableStore<AnyOngoingCall>;
            readonly group: ModelStore<Group>;
            readonly log: Logger;
        },
        running: readonly RunningGroupCall[],
        token: SfuToken,
    ): Promise<{
        readonly running: RunningGroupCall<'failed' | 'peeked' | 'ongoing'>[];
        readonly chosen: ChosenGroupCall | undefined;
    }> {
        const {log} = context;

        interface RefreshResult {
            readonly selectable: {
                readonly type: 'selectable';
                readonly call: RunningGroupCall<'peeked' | 'ongoing'>;
            };

            readonly ['not-selectable']: {
                readonly type: 'not-selectable';
                readonly call: RunningGroupCall<'failed' | 'peeked' | 'ongoing'>;
            };

            readonly ['not-running']: {
                readonly type: 'not-running';
                readonly ended: RunningGroupCall;
            };
        }

        // Refresh all calls of this group. The result includes a set of _running_ calls and an
        // information whether the call is selectable.
        //
        // Selectable calls include those which...
        //
        // - could be peeked, or
        // - are currently ongoing,
        //
        // and excludes those...
        //
        // - whose protocol version is currently not supported.
        const results = [...running].map(
            async (current): Promise<RefreshResult[keyof RefreshResult]> => {
                const id = current.base.derivations.callId;

                // Refresh
                let result;
                try {
                    result = await GroupCallRunningContext._refreshCall(
                        services,
                        context,
                        current,
                        token,
                    );
                } catch (error) {
                    log.error(`Unexpected error when refreshing group call (id=${id.id})`, error);
                    result = {type: 'failed'} as const;
                }

                // Handle result
                switch (result.type) {
                    case 'refreshed': {
                        // Update call
                        const refreshed: RunningGroupCall<'peeked' | 'ongoing'> = {
                            base: current.base,
                            ...result.state,
                        };
                        log.debug(`Refreshed group call (id=${id.id})`);

                        // Only yield the call if its protocol version is supported
                        if (refreshed.base.protocolVersion !== 1) {
                            log.info(
                                `Refreshed group call's protocol version is currently unsupported (id=${id.id}, protocol-version=${refreshed.base.protocolVersion})`,
                            );
                            return {type: 'not-selectable', call: refreshed};
                        }
                        return {type: 'selectable', call: refreshed};
                    }
                    case 'invalid':
                        log.debug(`Removed group call who is considered invalid (id=${id.id})`);
                        return {type: 'not-running', ended: current};
                    case 'ended':
                        // Remove call
                        log.debug(`Removed group call that ended (id=${id.id})`);
                        return {type: 'not-running', ended: current};
                    case 'failed':
                    case 'timeout': {
                        // Remove (if necessary) or increase failed counter
                        let nFailed = current.type === 'failed' ? current.nFailed : 0;
                        if (result.type === 'failed') {
                            ++nFailed;
                            if (nFailed < 3 || import.meta.env.VERBOSE_LOGGING.CALLS) {
                                log.debug(
                                    `Increased failed counter for group call (id=${id.id}, n-failed=${nFailed})`,
                                );
                            }
                        } else {
                            log.debug(
                                `Refreshing group call timed out (id=${id.id}, n-failed=${nFailed})`,
                            );
                        }

                        // The call is no longer considered running if the failed counter is >= 3
                        // and the call was received more than 10h ago.
                        if (
                            nFailed >= 3 &&
                            new Date().getTime() - current.base.receivedAt.getTime() > 36_000_000
                        ) {
                            log.warn(`Removed group call considered failed (id=${id.id})`);
                            return {type: 'not-running', ended: current};
                        }

                        const refreshed: RunningGroupCall<'failed'> = {
                            type: 'failed',
                            base: current.base,
                            nFailed,
                        };
                        return {type: 'not-selectable', call: refreshed};
                    }
                    default:
                        return unreachable(result);
                }
            },
        );

        // Retrieve refreshed (_running_ calls for the next iteration and for _chosen_ call
        // selection) calls and announce all calls as ended which have been dropped
        const refreshed = (await Promise.all(results))
            .map((result) => {
                if (result.type === 'not-running') {
                    // Announce _ended_
                    context.group
                        .get()
                        .controller.conversation()
                        .get()
                        .controller.createStatusMessage({
                            type: StatusMessageType.GROUP_CALL_ENDED,
                            createdAt: new Date(),
                            value: {
                                callId: result.ended.base.derivations.callId,
                                startedBy: result.ended.base.startedBy,
                            },
                        });
                }
                return result;
            })
            .filter(
                (result): result is RefreshResult['selectable'] | RefreshResult['not-selectable'] =>
                    result.type !== 'not-running',
            );

        // Find the most recently started call that is selectable and declare it as the _chosen_
        // call.
        const chosen = refreshed
            .filter((result): result is RefreshResult['selectable'] => result.type === 'selectable')
            .map(({call}) => call)
            .reduce<ChosenGroupCall | undefined>((other, current) => {
                if (other === undefined) {
                    return current;
                }
                const otherStartedAt = (
                    other.type === 'peeked' ? other.state : other.call.ctx
                ).startedAt.getTime();
                const currentStartedAt = (
                    current.type === 'peeked' ? current.state : current.call.ctx
                ).startedAt.getTime();
                return otherStartedAt > currentStartedAt ? other : current;
            }, undefined);

        // Return calls considered _running_ and the _chosen_ call.
        return {running: refreshed.map(({call}) => call), chosen};
    }

    /**
     * Add a group call that is considered _running_ to this group.
     *
     * Note 1: This will discard group calls with the same GCK as another (i.e. it will de-duplicate
     * group calls).
     *
     * Note 2: This will always trigger the _Group Call Refresh Steps_, so if multiple calls are
     * added (after being deserialised from the database), they should be bundled. This makes sense
     * because all entrypoints adding calls are required to trigger the _Group Call Refresh Steps_
     * by the protocol.
     */
    public async add(
        calls: readonly RunningGroupCall<'init' | 'failed' | 'ongoing'>[],
        type: 'new' | 'reload',
    ): Promise<{readonly chosen: Promise<ChosenGroupCall | undefined>}> {
        const registered = new ResolvablePromise<{
            readonly chosen: Promise<ChosenGroupCall | undefined>;
        }>({uncaught: 'default'});

        // Note: We need the lock to be hold during registration **and** until the refresh steps
        // finished without any other routine being able to acquire the lock in between.
        this._lock
            .with(async () => {
                // Add calls
                this._running.update((running) => {
                    for (const call of calls) {
                        // Check for duplicates
                        const existing = running.get(call.base.derivations.callId.id);
                        if (existing !== undefined) {
                            if (existing.type !== 'ongoing' && call.type === 'ongoing') {
                                // When joining, we'll get an _ongoing_ call, so we need to replace
                                // any existing _running_ call.
                                running.set(call.base.derivations.callId.id, call);
                            } else {
                                // Filter duplicate
                                this._log.warn('Discarding group call with same GCK as another');
                            }
                            continue;
                        }
                        running.set(call.base.derivations.callId.id, call);

                        // Announce _new_ calls
                        //
                        // Note 1: This maintains the history. In other words, a status will be created even
                        // if a group call is no longer running. This case will be picked up by the refresh
                        // steps and the corresponding _ended_ status message created. But because of this,
                        // it would be a bad idea to post notifications or ring for a group call here.
                        //
                        // Note 2: Desktop slightly violates the protocol here and announces group calls
                        // which later turn out to have a bad SFU base URL. Considered an edge case for now.
                        if (type === 'new') {
                            this._group.store
                                .get()
                                .controller.conversation()
                                .get()
                                .controller.createStatusMessage({
                                    type: StatusMessageType.GROUP_CALL_STARTED,
                                    createdAt: call.base.receivedAt,
                                    value: {
                                        callId: call.base.derivations.callId,
                                        startedBy: call.base.startedBy,
                                    },
                                });
                        }
                    }

                    return running;
                });

                // Run the group call refresh steps and determine the _chosen_ call
                try {
                    const refreshed = this._refresh(undefined);
                    registered.resolve({chosen: refreshed});
                    await refreshed;
                } catch (error: unknown) {
                    this._log.error('Group call refresh failed', error);
                    this._abort.raise('unexpected-error');
                    throw error;
                }
            }, 'refresh')
            .catch(assertUnreachable);

        // Wait until registered (but not until the _chosen_ call was determined)
        return await registered;
    }

    /**
     * Run the _Group Call Refresh Steps_ for this group.
     *
     * @param token A pre-acquired SFU token, if any.
     * @returns the chosen call, if any.
     */
    public async refresh(token: SfuToken | undefined): Promise<ChosenGroupCall | undefined> {
        try {
            // Note: We'll just let the group call refresh run even if the context has been aborted
            // as that's way simpler than aborting the whole flow. The result would simply be
            // ignored. However, if we need to to it properly for some reason, we can just attach
            // `abort` to the `fetch` calls and silence the resulting errors.
            return await Promise.race([
                this._abort.promise.then((cause) => {
                    this._log.debug(`Group call refresh aborted (cause=${cause})`);
                    return undefined;
                }),
                this._lock.with(async () => await this._refresh(token), 'refresh'),
            ]);
        } catch (error) {
            this._log.error('Group call refresh failed', error);
            this._abort.raise('unexpected-error');
            throw error;
        }
    }

    private async _refresh(token: SfuToken | undefined): Promise<ChosenGroupCall | undefined> {
        assert(this._lock.context === 'refresh');

        // Cancel any scheduled refresh
        this._cancel?.();
        this._cancel = undefined;

        // Because acquiring the lock for the group is async, we may run into a scenario where the
        // group no longer has any running calls in which case we can exit out early.
        if (this._running.get().size === 0) {
            this._log.debug('No group calls considered running, discarding refresh');
            return undefined;
        }

        // Fetch an SFU token, if necessary
        if (token === undefined) {
            try {
                token = await this._services.directory.sfuToken(
                    this._services.device.identity.string,
                    this._services.device.csp.ck,
                );
            } catch (error) {
                const message =
                    'Unable to refresh group calls because SFU token could not be acquired';
                this._log.warn(message, error);
                this._maybeScheduleRefresh();
                return undefined;
            }
        }

        // Refresh all calls considered _running_ for the group and retrieve the _chosen_ call.
        //
        // Note: Considered infallible
        const refreshed = await GroupCallRunningContext._refreshGroup(
            this._services,
            {ongoing: this._ongoing, group: this._group.store, log: this._log},
            [...this._running.get().values()],
            token,
        );
        this._running.update(
            () => new Map(refreshed.running.map((call) => [call.base.derivations.callId.id, call])),
        );
        this._group.chosen.update(() => refreshed.chosen);

        // Shut down the context if there are no longer any calls considered _running_.
        if (refreshed.running.length === 0) {
            assert(refreshed.chosen === undefined);
            this._abort.raise('no-call-running');
            return undefined;
        }

        // There are calls considered _running_, so schedule a refresh.
        this._maybeScheduleRefresh();
        return refreshed.chosen;
    }

    private _maybeScheduleRefresh(): void {
        // Sanity-check
        assert(this._lock.context !== undefined);
        assert(this._cancel === undefined);

        // Reschedule refreshing in 10s, if necessary.
        //
        // Note: The protocol allows us to increase to 30s while the group conversation is not
        // visible. This is not as relevant as on mobile apps, so we'll spare us the additional
        // complexity.
        if (this._running.get().size === 0) {
            assert(this._group.chosen.get() === undefined);
            return;
        }
        this._cancel = TIMER.timeout(() => {
            // Refresh calls of this group
            //
            // Note: The SFU token may be outdated at this point because of above fallthrough.
            // This is considered okay. The important bit is that we reschedule the refresh
            // again and don't bail out.
            this._lock
                .with(async () => await this._refresh(undefined), 'refresh')
                .catch((error: unknown) => {
                    this._log.error('Group call refresh failed', error);
                    this._abort.raise('unexpected-error');
                });
        }, 10_000);
    }
}

export class GroupCallManager {
    public readonly [TRANSFER_HANDLER] = PROXY_HANDLER;

    /**
     * A persistent set of group calls that are currently considered _running_.
     *
     * Note: Because we maintain a reference to the {@link ModelStore} of the group here, it is
     * not possible that the group model can be garbage collected while a group call is considered
     * _running_. This way, the store for the {@link ChosenGroupCall} can safely live on the
     * `GroupModelController`.
     */
    private readonly _running = new Map<ModelStore<Group>, GroupCallRunningContext>();

    public constructor(
        private readonly _services: ServicesForGroupCall,
        private readonly _ongoing: AsyncLock<CallType, WritableStore<AnyOngoingCall>>,
    ) {}

    /**
     * Register a group call that was received as a `GroupCallStart` or re-register former group
     * calls considered _running_ after app startup.
     *
     * IMPORTANT: `calls` must not be empty!
     *
     * @throws {GroupCallError} if the user is not a member of the group.
     */
    public async register(
        group: {
            readonly store: ModelStore<Group>;
            readonly chosen: WritableStore<ChosenGroupCall | undefined>;
        },
        calls: readonly RunningGroupCall<'init' | 'failed'>[],
        type: 'new' | 'reload',
    ): Promise<{readonly chosen: Promise<ChosenGroupCall | undefined>}> {
        assert(calls.length > 0);
        const log = this._services.logging.logger(`group-call-manager.register.${group.store.ctx}`);
        return await this._register(group, calls, type, log);
    }

    /**
     * Run the _Group Call Refresh Steps_ for the provided group.
     *
     * @param group Group to run the _Group Call Refresh Steps_ for.
     * @param token A pre-acquired SFU token, if any.
     * @returns the chosen call of the group, if any.
     */
    public async refresh(
        group: ModelStore<Group>,
        token: SfuToken | undefined,
    ): Promise<ChosenGroupCall | undefined> {
        return await this._running.get(group)?.refresh(token);
    }

    /**
     * Join an existing group call (intent `'join'`), or join or create a new group call (intent
     * `'join-or-create'`).
     *
     * Note: The caller needs to announce the call via a `GroupCallStart` message if the resulting
     * call has been created.
     *
     * @param group Associated group.
     * @param intent Whether we only want to join or also create a group call (if none existing).
     * @param cancel An abort signal from the UI when the user hangs up.
     * @throws {GroupCallError} if the user is participating in another group call, or if the user
     *   is not a member of the group or the call could not be joined for any other reason.
     */
    public async join<TIntent = 'join' | 'join-or-create'>(
        group: {
            readonly store: ModelStore<Group>;
            readonly chosen: WritableStore<ChosenGroupCall | undefined>;
        },
        intent: TIntent,
        cancel: AbortListener<unknown>,
    ): Promise<TIntent extends 'join' ? OngoingGroupCall | undefined : OngoingGroupCall> {
        const log = this._services.logging.logger(
            `group-call-manager.${intent}.${group.store.ctx}`,
        );

        // Abort signal gathering abort events from all places (the user hanging up from the UI, the
        // WebRTC context bailing out, becoming disconnected from the SFU or any other error).
        const abort = new AbortRaiser<AnyGroupCallContextAbort>();

        const result = await this._ongoing.with(async (ongoingStore) => {
            // Ensure the user is a member of the group initially
            group.store.run(({view: {userState}}) => {
                if (userState === GroupUserState.MEMBER) {
                    return;
                }
                const message = `Unable to join group call, user is not a member of the group! (user-state=${GroupUserStateUtils.NAME_OF[userState]})`;
                log.warn(message);
                throw new GroupCallError({kind: 'invalid-state'}, message);
            });

            // Ensure there's currently no other ongoing call
            ongoingStore.run((ongoingCall) => {
                if (ongoingCall !== undefined) {
                    const message = `Unable to apply intent '${intent}' because the user is in a call of type '${ongoingCall.type}'`;
                    log.warn(message);
                    throw new GroupCallError({kind: 'invalid-state'}, message);
                }
            });

            // Fetch an SFU token
            const startedAt = Date.now();
            let token;
            try {
                token = await this._services.directory.sfuToken(
                    this._services.device.identity.string,
                    this._services.device.csp.ck,
                );
            } catch (error) {
                const type: DirectoryErrorType =
                    error instanceof DirectoryError ? error.type : 'fetch';
                const message = 'Unable to fetch SFU token from directory';
                throw new GroupCallError({kind: 'directory-error', type}, message, {
                    from: error,
                });
            }

            // Abort the process (and later the group call) when
            //
            // - the user cancels the process,
            // - the user is no longer a member of the group or the group has been removed entirely,
            // - the group calls have been disabled in the settings (or via MDM parameters).
            const aborted = abort.promise.then((event) => {
                const message = `Group call has been aborted (origin=${event.cause}, cause=${event.origin})`;
                log.info(message);
                throw new GroupCallError({kind: 'invalid-state'}, message);
            });
            abort.subscribe(
                cancel.subscribe(() =>
                    abort.raise({origin: 'backend-worker', cause: 'user-hangup'}),
                ),
            );
            abort.subscribe(
                group.store.subscribe(({view, controller}) => {
                    // Check if the group has been removed
                    if (!controller.lifetimeGuard.active.get()) {
                        log.info(`Group call ended because the associated group has been removed`);
                        abort.raise({
                            origin: 'backend-worker',
                            cause: 'group-left-kicked-or-removed',
                        });
                    }

                    // Check if we have left or been removed from the group
                    if (view.userState !== GroupUserState.MEMBER) {
                        log.info(
                            `Group call ended because the user is no longer a member of the group (user-state=${GroupUserStateUtils.NAME_OF[view.userState]})`,
                        );
                        abort.raise({
                            origin: 'backend-worker',
                            cause: 'group-left-kicked-or-removed',
                        });
                    }
                }),
            );
            abort.subscribe(
                this._services.model.user.callsSettings.subscribe(({view: settings}) => {
                    if (settings.groupCallPolicy === GroupCallPolicy.DENY_GROUP_CALL) {
                        abort.raise({origin: 'backend-worker', cause: 'group-calls-disabled'});
                    }
                }),
            );

            // At this point, we need to explicitly abort in case of an error to prevent the group
            // subscription from logging confusing errors (e.g. the user leaves the group before the
            // `AbortRaiser` is garbage collected). Therefore, everything needs to be in a huge
            // try/catch block.
            try {
                let data: {readonly type: 'existing' | 'new'; readonly base: GroupCallBaseData};

                // Determine the _chosen_ call for the requested group
                {
                    const chosen = await Promise.race([
                        aborted,
                        this._running.get(group.store)?.refresh(token),
                    ]);
                    if (chosen !== undefined) {
                        data = {
                            type: 'existing',
                            base: chosen.base,
                        };
                    } else {
                        // The user's intent was to join a call but there is none to join
                        if (intent === 'join') {
                            log.warn('No group call is running that could be joined');
                            abort.raise({origin: 'backend-worker', cause: 'call-not-running'});
                            return undefined;
                        }

                        // Add an artificial wait period of 2s for users with butterfingers
                        const elapsedMs = Date.now() - startedAt;
                        const remainingArtificialWaitPeriodMs = clamp(2_000 - elapsedMs, {
                            min: 0,
                            max: 2_000,
                        });
                        await Promise.race([aborted, TIMER.sleep(remainingArtificialWaitPeriodMs)]);

                        // Create new call
                        const base = {
                            startedBy: this._services.device.identity.string,
                            receivedAt: new Date(),
                            protocolVersion: 1,
                            gck: wrapRawGroupCallKey(
                                this._services.crypto.randomBytes(new Uint8Array(32)),
                            ),
                            sfuBaseUrl: token.sfuBaseUrl,
                        };
                        data = {
                            type: 'new',
                            base: {
                                ...base,
                                group: group.store,
                                derivations: deriveGroupCallProperties(
                                    this._services,
                                    group.store.get().view,
                                    base,
                                ),
                            },
                        };
                    }
                }

                // Create WebRTC context
                const context = await Promise.race([
                    aborted,
                    this._services.webrtc.createGroupCallContext(
                        abort,
                        data.base.derivations.callId,
                    ),
                ]);

                // Forward all WebRTC context abort events (`context.abort`) to the local
                // AbortRaiser (`abort`)
                (await Promise.race([aborted, context.abort])).forward(abort);

                // Join call
                let join: JoinResponse;
                const fingerprint = await Promise.race([aborted, context.certificate()]);
                try {
                    join = await this._services.sfu.join(data.base, fingerprint, token);
                } catch (error) {
                    // Check for unexpected error
                    if (error instanceof GroupCallError) {
                        abort.raise({
                            origin: 'backend-worker',
                            cause:
                                error.type.kind === 'sfu-status-code' && error.type.status === 503
                                    ? 'call-full'
                                    : 'unexpected-error',
                        });
                        throw error;
                    } else {
                        abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
                        const message = 'Unexpected error when joining group call';
                        log.error(message, error);
                        throw new GroupCallError({kind: 'sfu-fetch'}, message, {from: error});
                    }
                }

                // Connect to call
                let call;
                try {
                    call = await GroupCall.create(this._services, abort, data.base, context, join);
                } catch (error) {
                    // Check for unexpected error
                    abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
                    if (!(error instanceof GroupCallError)) {
                        const message = 'Unexpected error when connecting to group call';
                        log.error(message, error);
                        throw new GroupCallError({kind: 'webrtc-connect'}, message, {from: error});
                    }
                    throw error;
                }

                // Declare it as the _ongoing_ call.
                const ongoingCall = new OngoingGroupCall(
                    this._services,
                    group.store.ctx,
                    abort,
                    data.base,
                    call,
                    {
                        type: data.type,
                        callId: data.base.derivations.callId,
                        startedAt: join.startedAt,
                        maxParticipants: join.maxParticipants,
                    },
                );
                ongoingStore.set(ongoingCall);
                log.info('Applied as ongoing call');

                // Remove _ongoing_ call when it stops
                abort.subscribe(() => {
                    log.debug('Removing call that ended');
                    this._ongoing
                        .with((ongoingStore_) => {
                            // Note: This would be a very bad logic error, as no other call type should
                            // be able to be created while this one was ongoing, so asserting here is
                            // reasonable.
                            assert(
                                ongoingStore_.get() === ongoingCall,
                                'Expected ongoing call instance to be the one that was created',
                            );
                            ongoingStore_.set(undefined);
                            log.info('Removed call that ended');
                        }, 'group-call')
                        .catch(assertUnreachable);
                });

                // Register call
                //
                // Note: This **must** be done after placing `ongoing` in the store as the
                // `GroupCallRunningContext` short-circuits peeking when the call is detected as
                // ongoing (which is what we want).
                {
                    const registered = await this._register(
                        group,
                        [{type: 'ongoing', base: data.base, call: ongoingCall}],
                        'new',
                        log,
                    );
                    const chosen = await registered.chosen;
                    if (
                        chosen === undefined ||
                        !byteEquals(
                            chosen.base.derivations.callId.bytes,
                            data.base.derivations.callId.bytes,
                        )
                    ) {
                        log.info(
                            'A different call was chosen in the meantime, meaning the user will be redirected to the chosen call soon',
                        );
                    }
                }

                // Done, FINALLY
                return ongoingCall;
            } catch (error) {
                // Check for unexpected error
                abort.raise({origin: 'backend-worker', cause: 'unexpected-error'});
                if (!(error instanceof GroupCallError)) {
                    const message = 'Encountered an unexpected error';
                    log.error(message, error);
                    throw new GroupCallError({kind: 'invalid-state'}, message, {from: error});
                }
                throw error;
            }
        }, 'group-call');

        return result satisfies OngoingGroupCall | undefined as TIntent extends 'join'
            ? OngoingGroupCall | undefined
            : OngoingGroupCall;
    }

    // IMPORTANT: `calls` must not be empty!
    private async _register(
        group: {
            readonly store: ModelStore<Group>;
            readonly chosen: WritableStore<ChosenGroupCall | undefined>;
        },
        calls: readonly RunningGroupCall<'init' | 'failed' | 'ongoing'>[],
        type: 'new' | 'reload',
        log: Logger,
    ): Promise<{readonly chosen: Promise<ChosenGroupCall | undefined>}> {
        assert(calls.length > 0);

        // Get or create the context
        let context = this._running.get(group.store);
        if (context === undefined) {
            // Ensure the user is a member of the group initially
            group.store.run(({view: {userState}}) => {
                if (userState === GroupUserState.MEMBER) {
                    return;
                }
                const message = `Unable to register group call running context, user is not a member of the group! (user-state=${GroupUserStateUtils.NAME_OF[userState]})`;
                log.warn(message);
                throw new GroupCallError({kind: 'invalid-state'}, message);
            });

            // Create the context and add it to the map
            const abort = new AbortRaiser<GroupCallRunningContextAbort>();
            context = new GroupCallRunningContext(
                this._services,
                // Note: This is fine because we only use it as a `IQueryableStore`. Only writing
                // needs to be guarded by the lock.
                this._ongoing.unwrap() as IQueryableStore<AnyOngoingCall>,
                group,
                abort,
            );
            this._running.set(group.store, context);
            log.info('Registered group call running context');

            // Remove the context from the map when it is being aborted
            abort.subscribe((cause) => {
                log.info(`Unregistering group call running context (cause=${cause})`);
                this._running.delete(group.store);
            });
        }

        // Add calls to context
        return await context.add(calls, type);
    }
}
