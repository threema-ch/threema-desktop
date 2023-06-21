/* tslint:disable */
/* eslint-disable */
/**
* @param {Logger} logger
* @param {LogLevel} min_log_level
*/
export function initLogging(logger: Logger, min_log_level: LogLevel): void;
export type PathStateUpdate = { state: "awaiting-nominate"; measuredRttMs: number } | { state: "nominated"; rph: Uint8Array };

export interface PathProcessResult {
    stateUpdate: PathStateUpdate | undefined;
    outgoingFrame: Uint8Array | undefined;
    incomingUlpData: Uint8Array | undefined;
}

export type InitialOutgoingFrames = InitialOutgoingFrame[];

export interface InitialOutgoingFrame {
    pid: number;
    frame: Uint8Array;
}


type LogRecordFn = (...data: readonly unknown[]) => void;

interface Logger {
    debug: LogRecordFn;
    info: LogRecordFn;
    warn: LogRecordFn;
    error: LogRecordFn;
}



type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';


/**
*/
export class RendezvousProtocol {
  free(): void;
/**
* @param {boolean} is_nominator
* @param {Uint8Array} ak
* @param {Uint32Array} pids
* @returns {RendezvousProtocol}
*/
  static newAsRid(is_nominator: boolean, ak: Uint8Array, pids: Uint32Array): RendezvousProtocol;
/**
* @param {boolean} is_nominator
* @param {Uint8Array} ak
* @param {Uint32Array} pids
* @returns {RendezvousProtocol}
*/
  static newAsRrd(is_nominator: boolean, ak: Uint8Array, pids: Uint32Array): RendezvousProtocol;
/**
* @returns {InitialOutgoingFrames | undefined}
*/
  initialOutgoingFrames(): InitialOutgoingFrames | undefined;
/**
* @returns {boolean}
*/
  isNominator(): boolean;
/**
* @returns {number | undefined}
*/
  nominatedPath(): number | undefined;
/**
* @param {number} pid
* @param {Uint8Array} chunk
*/
  addChunk(pid: number, chunk: Uint8Array): void;
/**
* @param {number} pid
* @returns {PathProcessResult}
*/
  processFrame(pid: number): PathProcessResult;
/**
* @param {number} pid
* @returns {PathProcessResult}
*/
  nominatePath(pid: number): PathProcessResult;
/**
* @param {Uint8Array} outgoing_data
* @returns {PathProcessResult}
*/
  createUlpFrame(outgoing_data: Uint8Array): PathProcessResult;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_rendezvousprotocol_free: (a: number) => void;
  readonly rendezvousprotocol_newAsRid: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly rendezvousprotocol_newAsRrd: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly rendezvousprotocol_initialOutgoingFrames: (a: number) => number;
  readonly rendezvousprotocol_isNominator: (a: number) => number;
  readonly rendezvousprotocol_nominatedPath: (a: number, b: number) => void;
  readonly rendezvousprotocol_addChunk: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly rendezvousprotocol_processFrame: (a: number, b: number, c: number) => void;
  readonly rendezvousprotocol_nominatePath: (a: number, b: number, c: number) => void;
  readonly rendezvousprotocol_createUlpFrame: (a: number, b: number, c: number, d: number) => void;
  readonly initLogging: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
