import {type ServicesForBackend} from '~/common/backend';
import {ensureEncryptedDataWithNonceAhead} from '~/common/crypto';
import {randomU8} from '~/common/crypto/random';
import {
    ConnectionState,
    D2mPayloadType,
    D2mPayloadTypeUtils,
    MessageFilterInstruction,
    type TransactionScope,
    TransactionScopeUtils,
} from '~/common/enum';
import {ConnectionClosed, ProtocolError} from '~/common/error';
import {type Logger} from '~/common/logging';
import * as protobuf from '~/common/network/protobuf';
import {
    CspPayloadType,
    type D2mMessage,
    type InboundL4CspMessage,
    type InboundL4D2mMessage,
    type InboundL4Message,
    type OutboundL4D2mTransactionMessage,
    type OutboundL4Message,
} from '~/common/network/protocol';
import * as structbuf from '~/common/network/structbuf';
import {
    isMessageId,
    type ReflectSequenceNumber,
    type ReflectSequenceNumberValue,
} from '~/common/network/types';
import {type u32, type u53, type WeakOpaque} from '~/common/types';
import {assert, ensureError, unreachable} from '~/common/utils/assert';
import {ByteBuffer} from '~/common/utils/byte-buffer';
import {u64ToHexLe} from '~/common/utils/number';
import {
    Queue,
    type QueueConsumer,
    type QueueProducer,
    type QueueValue,
    UnboundedQueue,
} from '~/common/utils/queue';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {SequenceNumberU32, SequenceNumberU53} from '~/common/utils/sequence-number';
import {type AbortListener} from '~/common/utils/signal';

import {
    ACTIVE_TASK,
    type ActiveTask,
    type ActiveTaskCodecHandle,
    type DecoderQueueItem,
    type DispatchQueues,
    type EncoderQueueItem,
    type InternalActiveTaskCodecHandle,
    type PassiveTaskCodecHandle,
    type RunnableTask,
    type ServicesForTasks,
    TASK_SYMBOL,
    type TaskCodecReadInstruction,
    type TaskController,
    TaskError,
    type TaskQueueItem,
} from '.';
import {getTaskForIncomingCspMessage as getTaskForIncomingL5CspMessage} from './csp';
import {getTaskForIncomingL5D2mMessage} from './d2m';

// Transaction running token. Must not be exported!
const TRANSACTION_RUNNING_TOKEN: unique symbol = Symbol('transaction-running-token');
// Transaction successfully completed token. Must not be exported!
const TRANSACTION_COMPLETE_TOKEN: unique symbol = Symbol('transaction-complete-token');
// Transaction aborted due to precondition. Must not be exported!
const TRANSACTION_ABORTED_BY_PRECONDITION_TOKEN: unique symbol = Symbol(
    'transaction-aborted-by-precondition-token',
);

/**
 * The transaction running token serves as proof that a transaction is in
 * progress and may be requested by any API requiring a running transaction.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface __TransactionRunning<S extends TransactionScope> {
    readonly token: typeof TRANSACTION_RUNNING_TOKEN;
    readonly id: u53;
    readonly scope: S;
}
type TransactionRunning<S extends TransactionScope> = __TransactionRunning<S>;

/**
 * The transaction complete token serves as proof that a transaction has been
 * completed and may be requested by any API requiring a completed transaction.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface __TransactionComplete<S extends TransactionScope> {
    readonly token: typeof TRANSACTION_COMPLETE_TOKEN;
    readonly id: u53;
    readonly scope: S;
}
type TransactionComplete<S extends TransactionScope> = __TransactionComplete<S>;

/**
 * The transaction was aborted by evaluation of the precondition.
 */
export interface TransactionAbortedByPrecondition<S extends TransactionScope> {
    readonly token: typeof TRANSACTION_ABORTED_BY_PRECONDITION_TOKEN;
    readonly id: u53;
    readonly scope: S;
}

// The above tokens may not be exported regularly, since they must remain private to this module.
// However, we need to access the tokens during testing (to mock the handle). For this, we export an
// `_only_for_testing` object. If anyone has a better idea, please fix ;)
// eslint-disable-next-line @typescript-eslint/naming-convention
export const _only_for_testing = {
    transactionRunning: <S extends TransactionScope>(id: u53, scope: S) =>
        ({
            token: TRANSACTION_RUNNING_TOKEN,
            id,
            scope,
        } as TransactionRunning<S>),
    transactionComplete: <S extends TransactionScope>(id: u53, scope: S) =>
        ({
            token: TRANSACTION_COMPLETE_TOKEN,
            id,
            scope,
        } as TransactionComplete<S>),
    transactionAborted: <S extends TransactionScope>(id: u53, scope: S) =>
        ({
            token: TRANSACTION_ABORTED_BY_PRECONDITION_TOKEN,
            id,
            scope,
        } as TransactionAbortedByPrecondition<S>),
};

const CONTINUE_READING_TOKEN = Symbol('continue-reading-token');
type ContinueReadingToken = typeof CONTINUE_READING_TOKEN;

const REFLECT_HEADER_LENGTH = 8;

type BacklogDecoderQueue = UnboundedQueue<DecoderQueueItem>;

interface DecoderQueues {
    backlog: BacklogDecoderQueue;
    readonly queue: QueueConsumer<DecoderQueueItem>;
}

interface EncoderQueues {
    readonly queue: QueueProducer<EncoderQueueItem>;
}

interface TaskManagerHandle {
    readonly decoderBacklog: Pick<BacklogDecoderQueue, 'empty' | 'all'>;
    readonly bypassOrBacklog: (message: InboundL4Message) => void;
}

type TransactionIdSequenceNumber = WeakOpaque<
    SequenceNumberU53<u53>,
    {readonly TransactionIdSequenceNumber: unique symbol}
>;

interface ProtocolTaskState {
    readonly tid: TransactionIdSequenceNumber;
    readonly rsn: ReflectSequenceNumber;
    transaction?: TransactionRunning<TransactionScope>;
}

/**
 * Whether the transaction was completed (`true`) or aborted (`false`).
 */
export function transactionCompleted<S extends TransactionScope>(
    state: __TransactionComplete<S> | TransactionAbortedByPrecondition<S>,
): state is TransactionComplete<S> {
    return state.token === TRANSACTION_COMPLETE_TOKEN;
}

class TaskCodec implements InternalActiveTaskCodecHandle, PassiveTaskCodecHandle {
    private readonly _log: Logger;
    private readonly _buffer: ByteBuffer;

    public constructor(
        private readonly _services: ServicesForTasks,
        public readonly controller: TaskController,
        public readonly abort: AbortListener,
        private readonly _manager: TaskManagerHandle,
        private readonly _name: string,
        private readonly _decoder: DecoderQueues,
        private readonly _encoder: EncoderQueues,
        private readonly _state: ProtocolTaskState,
    ) {
        this._log = _services.logging.logger('network.protocol.task-codec');
        this._buffer = new ByteBuffer(
            new Uint8Array(_services.config.MEDIATOR_FRAME_MAX_BYTE_LENGTH),
        );
    }

    public async step<T>(executor: () => Promise<T>): Promise<T> {
        // Ensure the task has not been aborted, then run the executor
        if (this.abort.aborted) {
            throw new ConnectionClosed('abort', 'Connection aborted by task manager signal');
        }
        return await executor();
    }

    /** @inheritdoc */
    public async read<T = undefined>(
        // TODO(WEBMD-813): Do not allow transaction messages!
        preprocess: (message: InboundL4Message) => TaskCodecReadInstruction<T>,
    ): Promise<T extends undefined ? undefined : T> {
        for (;;) {
            const event = await Promise.race([
                this._decoder.backlog.get(),
                this._decoder.queue.get(),
            ]);
            const outer = event.consume(
                (message): (T extends undefined ? undefined : T) | ContinueReadingToken => {
                    const inner = preprocess(message);

                    // IMPORTANT: Below section needs to be carefully evaluated when
                    //            changing TaskCodecReadInstruction!

                    // Special case: 'ACCEPT' with data
                    if (inner instanceof Array) {
                        const [instruction, data] = inner;
                        assert(
                            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                            instruction === MessageFilterInstruction.ACCEPT,
                            "Expect instruction with data to be of type 'ACCEPT'",
                        );
                        return data as T extends undefined ? undefined : T;
                    }

                    // Other cases: Instructions without data
                    const instruction = inner as MessageFilterInstruction;
                    switch (instruction) {
                        case MessageFilterInstruction.ACCEPT:
                            // Note: Safe as the runtime check above for inner being
                            // an instance of an array safes us.
                            return undefined as never;
                        case MessageFilterInstruction.BYPASS_OR_BACKLOG:
                            this._manager.bypassOrBacklog(message);
                            break;
                        case MessageFilterInstruction.REJECT:
                            this._reject(message);
                            break;
                        default: {
                            unreachable(instruction);
                        }
                    }
                    return CONTINUE_READING_TOKEN;
                },
            );
            if (outer !== CONTINUE_READING_TOKEN) {
                return outer;
            }
        }
    }

    /** @inheritdoc */
    public async write(
        message: Exclude<OutboundL4Message, OutboundL4D2mTransactionMessage>,
    ): Promise<void> {
        await this._write(message);
    }

    /** @inheritdoc */
    public async reflect<T extends readonly protobuf.d2d.IEnvelope[] | []>(
        payloads: T,
    ): Promise<{readonly [P in keyof T]: Date}> {
        const {d2d} = this.controller;
        const {crypto} = this._services;

        // We assume that at least one envelope is present after this point
        if (payloads.length === 0) {
            this._log.warn('Empty reflect array provided');
            return [] as unknown as {readonly [P in keyof T]: Date};
        }

        // Assign each envelope a reflect id (sequence number)
        const data = payloads.map(
            (payload): [id: ReflectSequenceNumberValue, envelope: protobuf.d2d.IEnvelope] => [
                this._state.rsn.next(),
                payload,
            ],
        );

        // Function that writes all reflect messages batched
        const reflect = async (): Promise<void> => {
            for (const [id, payload] of data) {
                // Send as a reflect message
                await this._write({
                    type: D2mPayloadType.REFLECT,
                    payload: structbuf.bridge.encoder(structbuf.d2m.payload.Reflect, {
                        headerLength: REFLECT_HEADER_LENGTH,
                        reserved: 0,
                        flags: 0, // TODO(WEBMD-778): Set appropriately
                        reflectId: id as u32,
                        envelope: d2d.dgrk
                            .encryptor(
                                this._buffer.reset(),
                                protobuf.utils.byteEncoder(protobuf.d2d.Envelope, {
                                    outgoingMessage: undefined,
                                    outgoingMessageUpdate: undefined,
                                    incomingMessage: undefined,
                                    incomingMessageUpdate: undefined,
                                    userProfileSync: undefined,
                                    contactSync: undefined,
                                    groupSync: undefined,
                                    distributionListSync: undefined,
                                    settingsSync: undefined,
                                    // TODO(WEBMD-48): This is not only a terrible cast but it's
                                    // also a lie!
                                    ...(payload as protobuf.utils.ProtobufInstanceOf<
                                        typeof protobuf.d2d.Envelope
                                    >),
                                    padding: new Uint8Array(randomU8(crypto)),
                                }).encode,
                            )
                            .encryptWithRandomNonceAhead(),
                    }),
                });
            }
        };

        // Function that reads all acknowledgements of the reflect messages
        // batched and returns the determined dates for each message
        const ack = async (): Promise<{readonly [P in keyof T]: Date}> => {
            const dates = [];
            const [[firstId]] = data;
            for (const [id] of data) {
                dates.push(
                    await this.read(({type, payload}) => {
                        if (type !== D2mPayloadType.REFLECT_ACK) {
                            return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                        }
                        assert(
                            payload instanceof structbuf.d2m.payload.ReflectAck,
                            'Expected a ReflectAck',
                        );
                        if (payload.reflectId !== id) {
                            if (id === firstId) {
                                return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                            } else {
                                throw new ProtocolError(
                                    'd2m',
                                    `Expected reflect id ${id}, got id ${payload.reflectId}`,
                                );
                            }
                        }
                        return [
                            MessageFilterInstruction.ACCEPT,
                            new Date(Number(payload.timestamp)),
                        ];
                    }),
                );
            }
            return dates as unknown as {readonly [P in keyof T]: Date};
        };

        // Wait until all messages have been reflected and acked
        const [, dates] = await Promise.all([reflect(), ack()]);
        return dates;
    }

    public async transaction<S extends TransactionScope, T>(
        scope: S,
        precondition: () => boolean,
        executor: (state: TransactionRunning<S>) => Promise<T>,
    ): Promise<
        [state: TransactionComplete<S>, message: T] | [state: TransactionAbortedByPrecondition<S>]
    > {
        const {d2d} = this.controller;

        // Assign transaction id
        const id = this._state.tid.next();

        // eslint-disable-next-line no-labels
        establishTransactionLoop: for (let tries = 1; ; ++tries) {
            // Begin the transaction
            this._log.debug(`Beginning transaction (${id}) (attempt #${tries})`);
            await this._write({
                type: D2mPayloadType.BEGIN_TRANSACTION,
                payload: protobuf.utils.encoder(protobuf.d2m.BeginTransaction, {
                    encryptedScope: d2d.dgtsk
                        .encryptor(
                            this._buffer.reset(),
                            protobuf.utils.byteEncoder(protobuf.d2d.TransactionScope, {
                                scope,
                            }).encode,
                        )
                        .encryptWithRandomNonceAhead(),
                    ttl: 0, // TODO(WEBMD-658): Set appropriate TTL
                }),
            });

            // Wait for an acknowledgement or a reject
            const receivedD2mMessage = await this.read<
                | D2mMessage<D2mPayloadType.BEGIN_TRANSACTION_ACK, protobuf.d2m.BeginTransactionAck>
                | D2mMessage<D2mPayloadType.TRANSACTION_REJECTED, protobuf.d2m.TransactionRejected>
            >((message) => {
                switch (message.type) {
                    case D2mPayloadType.BEGIN_TRANSACTION_ACK:
                        return [MessageFilterInstruction.ACCEPT, message];
                    case D2mPayloadType.TRANSACTION_REJECTED:
                        return [MessageFilterInstruction.ACCEPT, message];
                    default:
                        return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                }
            });

            switch (receivedD2mMessage.type) {
                case D2mPayloadType.BEGIN_TRANSACTION_ACK:
                    // Ack received, break out of the loop (!)
                    // eslint-disable-next-line no-labels
                    break establishTransactionLoop;
                case D2mPayloadType.TRANSACTION_REJECTED:
                    // Another device is currently running a transaction, so we
                    // need to wait until that ends.

                    this._log.debug(
                        `Transaction (${id}) rejected, another device is holding a lock with scope '${this._getTransactionScopeName(
                            receivedD2mMessage.payload,
                        )}'`,
                    );

                    await this.read(({type: type_}) => {
                        switch (type_) {
                            case D2mPayloadType.TRANSACTION_ENDED:
                                return MessageFilterInstruction.ACCEPT;
                            case D2mPayloadType.TRANSACTION_REJECTED:
                                // We did not make another transaction attempt,
                                // so another `TRANSACTION_REJECTED` would be a
                                // protocol violation.
                                return MessageFilterInstruction.REJECT;
                            default:
                                return MessageFilterInstruction.BYPASS_OR_BACKLOG;
                        }
                    });

                    // The previous transaction from another device ended, so
                    // we can attempt a retry once we have ensured ourselves
                    // that the transaction's precondition still applies.
                    this._log.debug(
                        `Transaction (${id}) can be reattempted, as another device released a lock with scope '${this._getTransactionScopeName(
                            receivedD2mMessage.payload,
                        )}'`,
                    );
                    if (!precondition()) {
                        this._log.debug(`Transaction (${id}) aborted by precondition`);
                        return [{token: TRANSACTION_ABORTED_BY_PRECONDITION_TOKEN, id, scope}];
                    }
                    break;
                default: {
                    unreachable(receivedD2mMessage);
                }
            }
        }

        // Ensure no incoming messages are backlogged for the task. This cannot
        // be the case since a `BEGIN_TRANSACTION` must be responded with a
        // `BEGIN_TRANSACTION_ACK`. Since we're the only consumer for incoming
        // messages at this point, this must have been the most recent message.
        if (!this._decoder.backlog.empty) {
            const backlogged = this._decoder.backlog
                .all()
                .map(({type}) => D2mPayloadTypeUtils.NAME_OF[type])
                .join(', ');
            throw new ProtocolError(
                'd2m',
                `Transaction open but task has pending backlogged messages: ${backlogged}`,
            );
        }

        // Notify incoming messages backlogged on the manager (i.e. explicitly
        // backlogged by the task). This is vital since the precondition check
        // ensures a consistent state across devices. However, that consistency
        // is potentially violated by any backlogged messages. Hence,
        // messages that are synchronising the state of another device to this
        // device must not be backlogged.
        //
        // Note: This exists for debugging purposes and is safe to be removed
        //       after substantial testing.
        if (!this._manager.decoderBacklog.empty) {
            const backlogged = this._manager.decoderBacklog
                .all()
                .map(({type}) => D2mPayloadTypeUtils.NAME_OF[type])
                .join(', ');
            this._log.warn(
                `Transaction open, manager has pending backlogged messages: ${backlogged}`,
            );
        }

        // Run the executor while the transaction is open. Skip the executor
        // if the precondition does not apply any more.
        let result:
            | [state: TransactionComplete<S>, message: T]
            | [state: TransactionAbortedByPrecondition<S>];
        if (!precondition()) {
            this._log.debug('Transaction open, skipping executor due to precondition abort');
            result = [{token: TRANSACTION_ABORTED_BY_PRECONDITION_TOKEN, id, scope}];
        } else {
            this._log.debug('Transaction open, running executor');
            result = [
                {token: TRANSACTION_COMPLETE_TOKEN, id, scope},
                await executor({token: TRANSACTION_RUNNING_TOKEN, id, scope}),
            ];
            this._log.debug('Executor of transaction returned');
        }

        // Commit the transaction and wait for acknowledgement
        this._log.debug('Committing transaction');
        await this._write({
            type: D2mPayloadType.COMMIT_TRANSACTION,
            payload: protobuf.utils.encoder(protobuf.d2m.CommitTransaction, {}),
        });
        await this.read(({type}) =>
            type === D2mPayloadType.COMMIT_TRANSACTION_ACK
                ? MessageFilterInstruction.ACCEPT
                : MessageFilterInstruction.BYPASS_OR_BACKLOG,
        );
        this._log.debug('Transaction complete');
        return result;
    }

    private _getTransactionScopeName(
        messagePayload: protobuf.d2m.TransactionRejected | protobuf.d2m.TransactionEnded,
    ): string {
        const transactionScope = protobuf.d2d.TransactionScope.decode(
            this._services.device.d2d.dgtsk
                .decryptorWithNonceAhead(
                    this._buffer.reset(),
                    ensureEncryptedDataWithNonceAhead(messagePayload.encryptedScope),
                )
                .decrypt(),
        );
        const transactionScopeName = TransactionScopeUtils.nameOf(transactionScope.scope);
        if (transactionScopeName === undefined) {
            this._log.debug(`Unexpected transaction scope: '${transactionScope.scope}'`);
            return 'UNKNOWN';
        }
        return transactionScopeName;
    }

    private async _write(message: OutboundL4Message): Promise<void> {
        // All use cases require being authenticated prior to sending any message to either the chat
        // server (CSP) or the mediator server (D2M).
        if (message.type === D2mPayloadType.PROXY) {
            await this.controller.csp.authenticated;
        } else {
            await this.controller.d2m.authenticated;
        }
        await this._encoder.queue.put(message);
    }

    private _reject(message: InboundL4Message): void {
        const description = `Received an unexpected message ${message.payload.constructor.name} while running task ${this._name}`;

        // Throw or log unexpected message, depending on build config
        if (import.meta.env.DEBUG) {
            this._decoder.queue.error(new ProtocolError('d2m', description));
        } else {
            this._log.error(description);
        }
    }
}

export class TaskManager {
    private _id: u53 = 0;
    private _inner: DisconnectedTaskManager | ConnectedTaskManager;

    public constructor(private readonly _services: Pick<ServicesForBackend, 'logging'>) {
        this._inner = new DisconnectedTaskManager(_services, this._id);
    }

    public get id(): u53 {
        return this._id;
    }

    /**
     * Replace the current underlying task manager in the following way:
     *
     * - If we're about to connect, replace it with a _connected_ task manager and return it.
     * - If we've just disconnected, replace it with a _disconnected_ task manager and return
     *   nothing.
     *
     * In both cases, all persistent task will be rescheduled and restarted in the new task manager.
     */
    public replace(
        connectionState: ConnectionState.CONNECTING | ConnectionState.DISCONNECTED,
    ): ConnectedTaskManager | undefined {
        switch (connectionState) {
            case ConnectionState.CONNECTING:
                assert(this._inner instanceof DisconnectedTaskManager);
                this._inner = new ConnectedTaskManager(this._services, ++this._id, this._inner);
                return this._inner;
            case ConnectionState.DISCONNECTED:
                assert(this._inner instanceof ConnectedTaskManager);
                this._inner = new DisconnectedTaskManager(this._services, ++this._id, this._inner);
                return undefined;
            default:
                return unreachable(connectionState);
        }
    }

    /**
     * Schedule a task.
     *
     * Note: Depending on which underlying task manager is currently being used, non-persistent
     *       tasks may be aborted immediately.
     *
     * @param task The task to be scheduled.
     * @returns A promise that resolves once the task has been processed.
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public schedule<TTaskResult>(
        task: ActiveTask<TTaskResult, 'persistent'> | ActiveTask<TTaskResult, 'volatile'>,
    ): Promise<TTaskResult> {
        return this._inner.schedule(task);
    }
}

class DisconnectedTaskManager {
    private readonly _log: Logger;
    private readonly _tasks: TaskQueueItem<unknown>[];

    public constructor(
        services: Pick<ServicesForBackend, 'logging'>,
        id: u53,
        previous?: ConnectedTaskManager,
    ) {
        this._log = services.logging.logger(`network.protocol.task-manager.disconnected.${id}`);
        this._tasks = previous?.tasks ?? [];
    }

    public get tasks(): TaskQueueItem<unknown>[] {
        return [...this._tasks];
    }

    /**
     * Schedule a **persistent** task.
     *
     * Note: Non-persistent taks will be aborted immediately!
     *
     * @param task The task to be scheduled.
     * @returns A promise that resolves once the task has been processed.
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public schedule<TTaskResult>(
        task: ActiveTask<TTaskResult, 'persistent'> | ActiveTask<TTaskResult, 'volatile'>,
    ): Promise<TTaskResult> {
        if (!task.persist) {
            return Promise.reject(
                new TaskError(
                    'aborted',
                    'Aborting non-persistent task because no connection is available',
                ),
            );
        }
        this._log.debug(
            `Scheduling task ${task.constructor.name} while disconnected (at position ${this._tasks.length})`,
        );
        const done = new ResolvablePromise<TTaskResult>();
        this._tasks.push({
            SYMBOL: TASK_SYMBOL,
            task,
            done: done as ResolvablePromise<unknown>,
        });
        return done;
    }
}

export class ConnectedTaskManager {
    public readonly dispatch: DispatchQueues;
    private readonly _log: Logger;
    private readonly _tasks: UnboundedQueue<TaskQueueItem<unknown>>;
    private readonly _decoder: DecoderQueues;
    private readonly _encoder: EncoderQueues;
    private readonly _state: ProtocolTaskState = {
        tid: new SequenceNumberU53(0) as TransactionIdSequenceNumber,
        rsn: new SequenceNumberU32(0) as ReflectSequenceNumber,
    };

    public constructor(
        services: Pick<ServicesForBackend, 'logging'>,
        public readonly id: u53,
        previous: DisconnectedTaskManager,
    ) {
        this._log = services.logging.logger(`network.protocol.task-manager.connected.${id}`);
        this._tasks = new UnboundedQueue(
            // Reschedule all persistent tasks and cancel all non-persistent tasks
            previous.tasks.filter(({task, done}) => {
                assert(!done.done, "Expected task to not be marked as 'done'");
                if (task.persist) {
                    this._log.debug(`Rescheduling persistent task ${task.constructor.name}`);
                    return true;
                } else {
                    this._log.debug(`Aborting non-persistent task ${task.constructor.name}`);
                    done.reject(new TaskError('aborted', 'Aborting task due to reconnection'));
                    return false;
                }
            }),
        );
        const decoder = {
            backlog: new UnboundedQueue() as BacklogDecoderQueue,
            queue: new Queue<DecoderQueueItem>(),
        };
        const encoder = {
            queue: new Queue<EncoderQueueItem>(),
        };
        this.dispatch = {
            decoder: decoder.queue,
            encoder: encoder.queue,
        };
        this._decoder = decoder;
        this._encoder = encoder;
    }

    public get tasks(): TaskQueueItem<unknown>[] {
        return this._tasks.all();
    }

    /**
     * Schedule a task.
     *
     * @param task The task to be scheduled.
     * @returns A promise that resolves once the transaction is complete or aborted.
     */
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    public schedule<TTaskResult>(
        task: ActiveTask<TTaskResult, 'persistent'> | ActiveTask<TTaskResult, 'volatile'>,
    ): Promise<TTaskResult> {
        this._log.debug(
            `Scheduling task ${task.constructor.name} while connected (at position ${this._tasks.length})`,
        );
        const done = new ResolvablePromise<TTaskResult>();
        this._tasks.put({
            SYMBOL: TASK_SYMBOL,
            task,
            done: done as ResolvablePromise<unknown>,
        });
        return done;
    }

    public async run(
        services: ServicesForBackend,
        controller: TaskController,
        abort: AbortListener,
    ): Promise<never> {
        this._log.debug('Running task manager');

        // TODO(WEBMD-580): Test
        abort.subscribe(() => {
            const aborted = new ConnectionClosed(
                'abort',
                'Connection aborted by task manager signal',
            );
            this._decoder.queue.error(aborted);
            this._decoder.backlog.error(aborted);
            this._encoder.queue.error(aborted);
        });

        // Run tasks.
        for (;;) {
            this._log.debug('Waiting for next task');
            try {
                const [task, done, consume] = await this._next(services, controller);

                // Run the task, if any
                if (task !== undefined) {
                    const type = task.type === ACTIVE_TASK ? 'active' : 'passive';
                    this._log.debug(`Running task: ${task.constructor.name} (${type})`);
                    const result = await this._run(task, services, controller, abort);
                    consume?.();
                    done?.resolve(result);
                    this._log.debug(`Task completed: ${task.constructor.name} (${type})`);
                }
            } catch (error_) {
                const error = ensureError(error_);
                this._tasks.error(error);
                this._decoder.backlog.error(error);
                this._decoder.queue.error(error);
                this._encoder.queue.error(error);
                this._log.debug('Exiting main loop');
                throw error;
            }
        }
    }

    private async _next(
        services: ServicesForBackend,
        controller: TaskController,
    ): Promise<
        [
            task: RunnableTask<unknown> | undefined,
            done?: ResolvablePromise<unknown>,
            consume?: QueueValue<TaskQueueItem<unknown>>['consume'],
        ]
    > {
        // IMPORTANT: Maintain this exact race order
        const event = await Promise.race([
            // 1: Look up a pending task
            this._tasks.get(),
            // 2: Look up items in the backlog decoder queue
            this._decoder.backlog.get(),
            // 3: Look up items in the decoder queue
            this._decoder.queue.get(),
        ]);
        if ('SYMBOL' in event.value) {
            // A task has been scheduled. Return it to the task runner.
            assert(event.value.SYMBOL === TASK_SYMBOL, 'Expected task symbol');
            const {
                consume,
                value: {task, done},
            } = event as QueueValue<TaskQueueItem<unknown>>;
            return [task, done, consume];
        } else {
            // An inbound message has been backlogged or queued. Process the message immediately or
            // create a task to process the inbound message.
            assert(this._tasks.empty, 'Expected no tasks to be queued');
            const {consume} = event as QueueValue<DecoderQueueItem>;
            const task = consume((message) => {
                if (message.type === D2mPayloadType.PROXY) {
                    return this._handleIncomingCspMessage(services, message.payload);
                } else {
                    return this._handleIncomingD2mMessage(services, message, controller);
                }
            });

            // Note: Tasks created by inbound messages do not need to land in the task queue since
            //       they will be recreated if the inbound message has not been acknowledged.
            //       Therefore, we don't need to bother scheduling them.
            return [task];
        }
    }

    private _handleIncomingD2mMessage(
        services: ServicesForTasks,
        message: InboundL4D2mMessage,
        controller: TaskController,
    ): RunnableTask<void> | undefined {
        switch (message.type) {
            case D2mPayloadType.DEVICES_INFO:
            case D2mPayloadType.REFLECTED:
                return getTaskForIncomingL5D2mMessage(services, message);
            case D2mPayloadType.DROP_DEVICE_ACK:
            case D2mPayloadType.REFLECT_ACK:
            case D2mPayloadType.BEGIN_TRANSACTION_ACK:
            case D2mPayloadType.COMMIT_TRANSACTION_ACK:
            case D2mPayloadType.TRANSACTION_REJECTED:
            case D2mPayloadType.TRANSACTION_ENDED:
                this._log.warn(
                    `Ignoring unexpected D2M message of type ${
                        D2mPayloadTypeUtils.NAME_OF[message.type]
                    }`,
                );
                return undefined;
            default:
                return unreachable(message);
        }
    }

    private _handleIncomingCspMessage(
        services: ServicesForTasks,
        message: InboundL4CspMessage['payload'],
    ): RunnableTask<void> | undefined {
        switch (message.type) {
            case CspPayloadType.INCOMING_MESSAGE:
            case CspPayloadType.ALERT:
            case CspPayloadType.CLOSE_ERROR:
                return getTaskForIncomingL5CspMessage(services, message);
            case CspPayloadType.OUTGOING_MESSAGE_ACK:
                this._log.warn(
                    `Ignoring unexpected CSP OutgoingMessageAck for message id '${
                        isMessageId(message.payload.messageId)
                            ? u64ToHexLe(message.payload.messageId)
                            : 'unknown'
                    }'`,
                );
                return undefined;
            default:
                return unreachable(message);
        }
    }

    private async _run(
        task: RunnableTask<unknown>,
        services: ServicesForTasks,
        controller: TaskController,
        abort: AbortListener,
    ): Promise<unknown> {
        // Move the backlog to the task's decoder
        const decoder = {...this._decoder};
        this._decoder.backlog = new UnboundedQueue();

        // Ensure the task is running in its expected transaction
        if (task.type === ACTIVE_TASK && task.transaction !== undefined) {
            const expected = task.transaction;
            const actual = this._state.transaction;
            if (actual === undefined) {
                const scope = TransactionScopeUtils.NAME_OF[expected.scope];
                throw new ProtocolError(
                    'd2m',
                    `Task ${task.constructor.name} expected a transaction ` +
                        `(id=${expected.id}, scope=${scope}) but no transaction is open`,
                );
            }
            if (
                expected.token !== actual.token ||
                expected.id !== actual.id ||
                expected.scope !== actual.scope
            ) {
                const scope = {
                    expected: TransactionScopeUtils.NAME_OF[expected.scope],
                    actual: TransactionScopeUtils.NAME_OF[actual.scope],
                };
                throw new ProtocolError(
                    'd2m',
                    `Task ${task.constructor.name} expected a transaction ` +
                        `(id=${expected.id}, scope=${scope.expected}) but we're in a different ` +
                        `transaction (id=${actual.id}, scope=${scope.actual})`,
                );
            }
        }

        // Run the task
        const handle = new TaskCodec(
            services,
            controller,
            abort,
            {
                decoderBacklog: this._decoder.backlog,
                bypassOrBacklog: this._bypassOrBacklog.bind(this),
            },
            task.constructor.name,
            decoder,
            this._encoder,
            this._state,
        );
        // Note: `ActiveTaskCodecHandle<'persistent'>` is a superset of all task codec handles which
        //       is why we cast to it. The typing of the tasks will take care of the rest.
        const result = await task.run(handle as unknown as ActiveTaskCodecHandle<'persistent'>);

        // Transfer remaining backlogged messages that the task did not process
        this._decoder.backlog.prepend(decoder.backlog);

        return result;
    }

    // TODO(WEBMD-779): Move into L5
    private _bypassOrBacklog(message: InboundL4Message): void {
        // TODO(WEBMD-779): This is a message coming from a task. We need to:
        // 1. Check if the message should be handled directly -> forward to _process, then schedule if needed
        // 2. Check if the message can be backlogged -> Copy the message and backlog!
        // 3. Can't bypass or backlog? Error!
        // (Check if a transaction is in progress?)

        // TODO(WEBMD-779): IMPORTANT: All D2M messages must be handled directly as the
        // precondition check requires a consistent state across devices.
        this._log.warn(`Backlogging ${D2mPayloadTypeUtils.NAME_OF[message.type]}`);
        this._decoder.backlog.put(message);
    }

    // TODO(WEBMD-779)
    // private _mayBypass(message: InboundL4Message): boolean {
    //     // TODO
    //     // if (message.type === D2mPayloadType.PROXY) {
    //     //     const type = message.payload.type;
    //     //     switch (type) {
    //     //         case CspPayloadType.INCOMING_MESSAGE:
    //     //         case CspPayloadType.CLOSE_ERROR:
    //     //         case CspPayloadType.ALERT:
    //     //             return false;
    //     //         case CspPayloadType.OUTGOING_MESSAGE_ACK:
    //     //         case CspPayloadType.QUEUE_SEND_COMPLETE:
    //     //             return true;
    //     //         default:
    //     //             unreachable(type);
    //     //     }
    //     // } else {
    //     //     const type = message.type;
    //     //     switch (type) {
    //     //         default:
    //     //             unreachable(type);
    //     //     }
    //     // }
    //     return false;
    // }
}
