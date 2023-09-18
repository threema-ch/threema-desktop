import {expect} from 'chai';

import {type PropertiesMarked} from '~/common/utils/endpoint';
import {ReadableStore, WritableStore} from '~/common/utils/store';
import {LocalSetDerivedSetStore} from '~/common/utils/store/set-store';

/**
 * Test of set stores.
 */
export function run(): void {
    describe('SetDerivedSetStore', function () {
        // Casts to PropertiesMarked below are OK because we don't do transfers and the actual
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
    });
}
