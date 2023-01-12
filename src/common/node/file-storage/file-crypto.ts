import {type ReadonlyUint8Array, type u53} from '~/common/types';
import {byteView} from '~/common/utils/byte';

/**
 * Counter based IV (initialization vector) for AES-GCM.
 *
 * The counter is written into a 12-byte Uint8Array in big-endian format.
 *
 * Up to 2**32 counter values are supported. After that, the {@link next} method will throw an
 * exception.
 */
export class CounterIv {
    public static readonly MAX_COUNTER = 2 ** 32 - 1;

    private _counter: u53 = 0;
    private readonly _iv = new Uint8Array(12);

    /**
     * Return a 12-byte Uint8Array corresponding to the current counter.
     *
     * WARNING: For every call to {@link next()}, an internal buffer is re-used. Make sure to use or
     *          copy the returned array before you call {@link next()} again!
     */
    public next(): ReadonlyUint8Array {
        if (this._counter > CounterIv.MAX_COUNTER) {
            throw new Error(`Max counter reached!`);
        }
        const view = byteView(DataView, this._iv);
        view.setUint32(8, this._counter++, false);
        return this._iv;
    }
}
