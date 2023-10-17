import {expect} from 'chai';

import {DeltaUpdateType} from '~/common/enum';
import type {u53} from '~/common/types';
import {
    TRANSFER_HANDLER,
    type PropertiesMarked,
    type PROXY_HANDLER,
    type ProxyMarked,
} from '~/common/utils/endpoint';
import {ReadableStore, WritableStore} from '~/common/utils/store';
import {derive} from '~/common/utils/store/derived-store';
import {type DeltaUpdate, LocalSetDerivedSetStore} from '~/common/utils/store/set-store';

const FAKE_PROXY_HANDLER = undefined as unknown as typeof PROXY_HANDLER;

/**
 * Value wrapper which implements {@link CustomTransferable}.
 */
class Value implements ProxyMarked {
    public readonly [TRANSFER_HANDLER] = FAKE_PROXY_HANDLER;
    public constructor(public readonly value: u53) {}
}

/**
 * Test of set stores.
 */
export function run(): void {
    describe('SetDerivedSetStore', function () {
        // Note: Casts to PropertiesMarked below are OK because we don't do transfers and the actual
        // object references are compared in expect.

        it('should create a set store with the same initial values', function () {
            const values = [{a: 'A'}, {b: 'B'}] as unknown as PropertiesMarked[];
            const originalSet = new ReadableStore(new Set(values));
            const setStore = new LocalSetDerivedSetStore(originalSet);

            expect([...setStore.get()], 'SetStore values').to.have.same.members(values);
        });

        it('should add new items to the SetStore', function () {
            const values = new Set([{a: 'A'}, {b: 'B'}] as unknown as PropertiesMarked[]);
            const originalSet = new WritableStore(values);
            const setStore = new LocalSetDerivedSetStore(originalSet);

            values.add({c: 'C'} as unknown as PropertiesMarked);
            values.add({d: 'D'} as unknown as PropertiesMarked);
            originalSet.set(values);

            expect([...setStore.get()], 'SetStore values').to.have.same.members([...values]);
        });

        it('should remove deleted items from the SetStore', function () {
            const itemB = {b: 'B'} as unknown as PropertiesMarked;
            const values = new Set([{a: 'A'}, itemB] as unknown as PropertiesMarked[]);
            const originalSet = new WritableStore(values);
            const setStore = new LocalSetDerivedSetStore(originalSet);

            values.delete(itemB);
            originalSet.set(values);

            expect(setStore.get().size, 'SetStore values').to.equal(1);
            expect([...setStore.get()], 'SetStore values').to.have.same.members([...values]);
        });

        it('should clear the SetStore if the input set is cleared', function () {
            const values = new Set([{a: 'A'}, {b: 'B'}] as unknown as PropertiesMarked[]);
            const originalSet = new WritableStore(values);
            const setStore = new LocalSetDerivedSetStore(originalSet);

            values.clear();
            originalSet.set(values);

            expect(setStore.get().size, 'SetStore values').to.equal(0);
        });

        it('should propagate delta updates (add)', function () {
            // Create objects (not primitives, since comparison is done by reference)
            const value1 = new Value(1);
            const value2 = new Value(2);
            const value3 = new Value(3);
            const value4 = new Value(4);
            const value5 = new Value(5);

            // Source store, based on array
            const sourceStore = new WritableStore<Value[]>([value1, value2]);

            // Derived store (which doesn't actually change anything about the values)
            const derivedStore = new LocalSetDerivedSetStore(
                derive(sourceStore, (sourceSet) => new Set([...sourceSet])),
            );

            // Subscribe to events
            const events: DeltaUpdate<Value>[] = [];
            derivedStore.delta.subscribe((event) => events.push(event));
            function clearEvents(): void {
                events.length = 0;
            }

            // Add value to the source array, ensure that delta updates are propagated
            sourceStore.set([value1, value2, value3]);
            expect(events).to.deep.equal([[DeltaUpdateType.ADDED, [value3]]]);
            clearEvents();

            // Remove value
            sourceStore.set([value1, value3]);
            expect(events).to.deep.equal([[DeltaUpdateType.DELETED, [value2]]]);
            clearEvents();

            // Add two, remove one
            sourceStore.set([value1, value4, value5]);
            expect(events).to.deep.equal([
                [DeltaUpdateType.DELETED, [value3]],
                [DeltaUpdateType.ADDED, [value4, value5]],
            ]);
            clearEvents();
        });
    });
}
