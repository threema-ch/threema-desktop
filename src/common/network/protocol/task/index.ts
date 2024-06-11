import type {ServicesForBackend} from '~/common/backend';
import type {DeviceGroupBoxes} from '~/common/crypto/device-group-keys';
import {
    CspE2eConversationType,
    CspE2eGroupConversationType,
    type D2dCspMessageType,
    type MessageFilterInstruction,
    type TransactionScope,
    TransferTag,
} from '~/common/enum';
import {BaseError, type BaseErrorOptions} from '~/common/error';
import type {CloseInfo} from '~/common/network';
import type * as protobuf from '~/common/network/protobuf';
import {
    type CspE2eType,
    cspE2eTypeNameOf,
    type InboundL4Message,
    MESSAGE_TYPE_PROPERTIES,
    type OutboundL4D2mTransactionMessage,
    type OutboundL4Message,
    type OutboundPassiveTaskMessage,
} from '~/common/network/protocol';
import type {
    __TransactionComplete as TransactionComplete,
    __TransactionRunning as TransactionRunning,
    TransactionAbortedByPrecondition,
} from '~/common/network/protocol/task/manager';
import type {IdentityString} from '~/common/network/types';
import type {ClientKey} from '~/common/network/types/keys';
import type {WeakOpaque} from '~/common/types';
import {assertUnreachable, unreachable} from '~/common/utils/assert';
import {registerErrorTransferHandler, TRANSFER_HANDLER} from '~/common/utils/endpoint';
import {isGroupManagedAndMonitoredByGateway, isGroupManagedByGateway} from '~/common/utils/group';
import type {QueueConsumer, QueueProducer} from '~/common/utils/queue';
import type {QueryablePromise, ResolvablePromise} from '~/common/utils/resolvable-promise';
import type {AbortListener} from '~/common/utils/signal';

// Re-export for other APIs
export type {TransactionRunning};
export type {TransactionComplete};

/**
 * Services needed by the tasks.
 */
export type ServicesForTasks = Pick<
    ServicesForBackend,
    | 'blob'
    | 'config'
    | 'crypto'
    | 'device'
    | 'directory'
    | 'file'
    | 'logging'
    | 'media'
    | 'model'
    | 'nonces'
    | 'notification'
    | 'systemDialog'
    | 'volatileProtocolState'
>;

/**
 * Properties needed in tasks.
 */
export interface TaskController {
    /**
     * Chat Server Protocol releated properties.
     */
    readonly csp: {
        /**
         * Client Key (32 bytes, permanent secret key associated to the Threema ID).
         */
        readonly ck: ClientKey;

        /**
         * Resolves once the authentication process has been completed.
         */
        readonly authenticated: Promise<void>;
    };

    /**
     * Device to Mediator protocol related properties.
     */
    readonly d2m: {
        /**
         * Resolves once the authentication process has been completed.
         */
        readonly authenticated: Promise<void>;

        /**
         * Whether we were promoted to be the leader device.
         */
        readonly promotedToLeader: QueryablePromise<void>;
    };

    /**
     * Device to device protocol releated properties.
     */
    readonly d2d: Pick<DeviceGroupBoxes, 'dgrk' | 'dgtsk'>;
}

export type TaskCodecReadInstruction<T = undefined> =
    | (T extends undefined
          ? MessageFilterInstruction.ACCEPT
          : [instruction: MessageFilterInstruction.ACCEPT, message: T])
    | MessageFilterInstruction.BYPASS_OR_BACKLOG
    | MessageFilterInstruction.REJECT;

interface TaskCodecHandle {
    readonly abort: AbortListener<CloseInfo>;
    readonly controller: TaskController;

    readonly step: <T>(executor: () => Promise<T>) => Promise<T>;
}

export interface PassiveTaskCodecHandle extends TaskCodecHandle {
    readonly write: (message: OutboundPassiveTaskMessage) => Promise<void>;
}

/**
 * The result of a transaction. Either it is complete, or it was aborted by the precondition.
 *
 * To check for completion, the `transactionCompleted` helper function (in `manager.ts`) can be
 * used.
 */
export type TransactionResult<S extends TransactionScope, T> =
    | [state: TransactionComplete<S>, message: T]
    | [state: TransactionAbortedByPrecondition<S>];

/**
 * An active task may be either persistent or volatile (non-persistent).
 */
export type ActiveTaskPersistence = 'persistent' | 'volatile';

export interface InternalActiveTaskCodecHandle extends TaskCodecHandle {
    /**
     * Write a message to the outgoing queue.
     *
     * The promise will resolve once the message has been written to the outgoing queue. It may or
     * may not have been delivered to the server at that point.
     */
    readonly write: (
        message: Exclude<OutboundL4Message, OutboundL4D2mTransactionMessage>,
    ) => Promise<void>;

    /**
     * Read a message. The preprocess callback allows to filter and validate
     * the message.
     *
     * Note: Any data returned by the preprocess callback is immediately
     *       (synchronously) returned by this function. Returning the message
     *       (or parts of it) is allowed.
     */
    readonly read: <T = undefined>(
        preprocess: (message: InboundL4Message) => TaskCodecReadInstruction<T>,
    ) => Promise<T extends undefined ? undefined : T>;

    /**
     * Reflect one or more messages.
     *
     * The promise will resolve once the reflection of all messages is acked by the Mediator
     * server.
     *
     * @returns An array of dates in the same order as the messages passed in. The dates represent
     *   when the message has been stored in the reflection queue of the Mediator server.
     */
    readonly reflect: <T extends readonly protobuf.d2d.IEnvelope[] | []>(
        payloads: T,
    ) => Promise<{readonly [P in keyof T]: Date}>;

    /**
     * Run an executor within a transaction.
     *
     * The precondition function may be called multiple times but will be
     * called at least once before the executor will be called. It needs to
     * determine whether the transaction is still required and return `true`
     * in order to continue or `false` in order to silently abort.
     *
     * IMPORTANT: Data returned by the executor must be protected against
     *            modification since the transaction will be asynchronously
     *            committed before the function exits.
     */
    readonly transaction: <S extends TransactionScope, T>(
        scope: S,
        precondition: () => boolean,
        executor: (state: TransactionRunning<S>) => Promise<T>,
    ) => Promise<TransactionResult<S, T>>;
}

export type ActiveTaskCodecHandle<TPersistence extends ActiveTaskPersistence> = {
    persistent: WeakOpaque<
        InternalActiveTaskCodecHandle,
        {
            readonly ActiveTaskPersistenceToken: unique symbol;
        }
    >;
    volatile: InternalActiveTaskCodecHandle;
}[TPersistence];

/**
 * A task that can be directly executed by the task manager.
 */
export type RunnableTask<T> = ActiveTask<T, ActiveTaskPersistence> | PassiveTask<T>;

/**
 * An active task has the following properties (as opposed to a passive task):
 *
 * - It may read, write and reflect arbitrary messages
 * - It may start transactions
 * - It may trigger side effects (i.e. start other tasks)
 * - It may be persistable in which case the task must be idempotent (i.e. yield the same result
 *   when ran multiple times).
 *
 * An active task must be schedulable (i.e. may be stored and run at a later time) and will need to
 * be serialisable if persistence is required.
 */
export interface ActiveTask<TTaskResult, TPersistence extends ActiveTaskPersistence> {
    readonly type: ActiveTaskSymbol;

    /**
     * Whether the task should persist and rerun from the beginning if the
     * connection has been lost or the app has been restarted.
     */
    readonly persist: {persistent: true; volatile: false}[TPersistence];

    /**
     * Whether the task expects to be run inside a specific transaction.
     *
     * TODO(DESK-613): This is probably mutually exclusive to `persist: true`, so model it
     * accordingly.
     */
    readonly transaction: TransactionRunning<TransactionScope> | undefined;

    /**
     * Run the task to completion.
     */
    readonly run: (handle: ActiveTaskCodecHandle<TPersistence>) => Promise<TTaskResult>;
}

/**
 * A passive task has fewer permissions than an {@link ActiveTask}. It is not persistent and it
 * should never schedule other tasks.
 *
 * In general, a passive task may not do any network communication, with two exceptions:
 *
 * - Sending acknowledgements
 */
export interface PassiveTask<TTaskResult> {
    readonly type: PassiveTaskSymbol;

    /**
     * Passive tasks never persist.
     */
    readonly persist: false;

    /**
     * Run the task to completion.
     */
    readonly run: (handle: PassiveTaskCodecHandle) => Promise<TTaskResult>;
}

/**
 * A Task that may not be executed by the task manager, but is only used for composition.
 */
export interface ComposableTask<TTaskCodecHandleType extends TaskCodecHandle, TReturnType> {
    /**
     * Composable tasks have no concept of persistence, so it may not be defined.
     */
    readonly persist?: never;

    /**
     * Run the task to completion.
     */
    readonly run: (handle: TTaskCodecHandleType) => Promise<TReturnType>;
}

export type DecoderQueueItem = InboundL4Message;
export type EncoderQueueItem = OutboundL4Message;

export const ACTIVE_TASK: unique symbol = Symbol('active-task');
export const PASSIVE_TASK: unique symbol = Symbol('passive-task');
export type ActiveTaskSymbol = typeof ACTIVE_TASK;
export type PassiveTaskSymbol = typeof PASSIVE_TASK;

export const TASK_SYMBOL = Symbol('task-symbol');
export interface TaskQueueItem<TTaskResult> {
    readonly SYMBOL: typeof TASK_SYMBOL;
    readonly task: RunnableTask<TTaskResult>;
    readonly done: ResolvablePromise<TTaskResult, Error>;
}

export interface DispatchQueues {
    readonly decoder: QueueProducer<DecoderQueueItem>;
    readonly encoder: QueueConsumer<EncoderQueueItem>;
}

/**
 * Type of the {@link TaskError}.
 *
 * - aborted: The non-persistent task was aborted due to a reconnection attempt.
 */
export type TaskErrorType = 'aborted';

const TASK_ERROR_TRANSFER_HANDLER = registerErrorTransferHandler<
    TaskError,
    TransferTag.TASK_ERROR,
    [type: TaskErrorType]
>({
    tag: TransferTag.TASK_ERROR,
    serialize: (error) => [error.type],
    deserialize: (message, cause, [type]) => new TaskError(type, message, {from: cause}),
});

/**
 * Errors related to tasks.
 */
export class TaskError extends BaseError {
    public [TRANSFER_HANDLER] = TASK_ERROR_TRANSFER_HANDLER;

    public constructor(
        public readonly type: TaskErrorType,
        message: string,
        options?: BaseErrorOptions,
    ) {
        super(message, options);
    }
}

export function placeholderTextForUnhandledMessage(
    d2dMessageType: D2dCspMessageType,
): string | undefined {
    let messageTitle = undefined;

    switch (d2dMessageType) {
        case CspE2eConversationType.DEPRECATED_IMAGE:
        case CspE2eConversationType.DEPRECATED_AUDIO:
        case CspE2eConversationType.DEPRECATED_VIDEO:
        case CspE2eConversationType.FILE:
        case CspE2eGroupConversationType.DEPRECATED_GROUP_IMAGE:
        case CspE2eGroupConversationType.GROUP_AUDIO:
        case CspE2eGroupConversationType.GROUP_VIDEO:
        case CspE2eGroupConversationType.GROUP_FILE:
            messageTitle = 'Media / file message.';
            break;
        case CspE2eGroupConversationType.GROUP_POLL_SETUP:
        case CspE2eConversationType.POLL_SETUP:
            messageTitle = 'Poll message.';
            break;
        case CspE2eConversationType.LOCATION:
        case CspE2eGroupConversationType.GROUP_LOCATION:
            messageTitle = 'Location message.';
            break;
        default:
            messageTitle = undefined;
    }

    if (messageTitle === undefined) {
        return undefined;
    }

    return `${messageTitle}\n\n_Please view this message on your mobile device. It is not yet supported on desktop._`;
}

/**
 * Determines if the creator of a group should receive messages of the given type.
 *
 * @returns `true` if the group creator should receive messages of the given {@link messageType},
 *   `false` otherwise.
 */
export function shouldSendGroupMessageToCreator(
    groupName: string,
    creatorIdentity: IdentityString,
    messageType: CspE2eType,
): boolean {
    // Non-gateway group creators always receive all messages
    const groupManagedByGateway = isGroupManagedByGateway(creatorIdentity);
    if (!groupManagedByGateway) {
        return true;
    }

    // Gateway group creators prefixed with cloud emoji always receive all messages
    const groupMonitoredByGateway = isGroupManagedAndMonitoredByGateway(groupName, creatorIdentity);
    if (groupMonitoredByGateway) {
        return true;
    }

    // For gateway groups not prefixed with cloud emoji, it depends on the message type
    const messageTypeProperties = MESSAGE_TYPE_PROPERTIES[messageType];
    switch (messageTypeProperties.sendToGatewayGroupCreator) {
        case 'always':
            return true;
        case 'if-captured':
            // Gateway group creators prefixed with cloud emoji always receive all messages
            return groupName.startsWith('☁');
        case 'not-applicable':
            return assertUnreachable(
                `Message of type ${cspE2eTypeNameOf(
                    messageType,
                )} is never sent to group creators and should not be passed to shouldSendGroupMessageToCreator`,
            );
        default:
            return unreachable(messageTypeProperties);
    }
}
