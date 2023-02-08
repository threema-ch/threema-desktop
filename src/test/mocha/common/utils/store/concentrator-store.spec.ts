import {expect} from 'chai';

import {type u32} from '~/common/types';
import {assert as typeAssert} from '~/common/utils/assert';
import {
    type IQueryableStore,
    LAZY_STORE_DISABLED_STATE,
    LAZY_STORE_ENABLED_STATE,
    ReadableStore,
    type StoreSubscriber,
    type StoreUnsubscriber,
    WritableStore,
} from '~/common/utils/store';
import {
    ConcentratorStore,
    type QueryableStores,
    type States,
    type StoreValues,
} from '~/common/utils/store/concentrator-store';

class ExposedStateConcentratorStore<
    TSourceStores extends QueryableStores,
> extends ConcentratorStore<TSourceStores> {
    public declare _state: States<TSourceStores>;
}

type SimpleSourceStores = readonly [
    zero: WritableStore<string>,
    one: WritableStore<u32>,
    twoo: WritableStore<{someString: string}>,
];

function getSourceStoresValues(sourceStores: SimpleSourceStores): StoreValues<SimpleSourceStores> {
    return sourceStores.map((sourceStore) =>
        sourceStore.get(),
    ) as unknown as StoreValues<SimpleSourceStores>;
}

function createSimpleConcentratorStore(): readonly [
    concentratorStore: ExposedStateConcentratorStore<SimpleSourceStores>,
    sourceStores: SimpleSourceStores,
    sourceStoreValues: StoreValues<SimpleSourceStores>,
] {
    const zero = new WritableStore<string>('Intitial Value!');
    const one = new WritableStore<u32>(42);
    const twoo = new WritableStore<{someString: string}>({someString: 'Hello'});
    const sourceStores = [zero, one, twoo] as const;

    const concentratorStore = new ExposedStateConcentratorStore(sourceStores);
    const sourceStoreValues = getSourceStoresValues(sourceStores);
    return [concentratorStore, sourceStores, sourceStoreValues];
}

/**
 * Test of random utils.
 */
export function run(): void {
    describe('ConcentratorStore', function () {
        describe('get', function () {
            it('should return the concentrated values', function () {
                const [store, , sourceStoreValues] = createSimpleConcentratorStore();
                expect(store.get()).to.deep.equal(sourceStoreValues);
            });
            it('should work when store was in disabled state', function () {
                const [store, , sourceStoreValues] = createSimpleConcentratorStore();
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
                expect(store.get()).to.deep.equal(sourceStoreValues);
            });
            it('should work when store was in enabled state', function () {
                const [store, , sourceStoreValues] = createSimpleConcentratorStore();
                const unsubscriber = store.subscribe(() => {
                    // No-op
                });
                expect(store._state.symbol).to.equal(LAZY_STORE_ENABLED_STATE);
                expect(store.get()).to.deep.equal(sourceStoreValues);
                expect(store._state.symbol).to.equal(LAZY_STORE_ENABLED_STATE);
                unsubscriber();
            });
            it('should return the store to the disabled state', function () {
                const [store, , sourceStoreValues] = createSimpleConcentratorStore();
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
                expect(store.get()).to.deep.equal(sourceStoreValues);
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
            });
        });
        describe('subscribe', function () {
            it('should enable the store on first subscription', function () {
                const [store] = createSimpleConcentratorStore();
                const unsubscriber = store.subscribe(() => {
                    // No-op
                });
                expect(store._state.symbol, 'Store to be enabled after subscriptions').to.equal(
                    LAZY_STORE_ENABLED_STATE,
                );
                unsubscriber();
            });
            it('should disable the store on last unsubscription', function () {
                const [store] = createSimpleConcentratorStore();
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);

                const unsubscribers = [undefined, undefined].map(() =>
                    store.subscribe(() => {
                        // No-op
                    }),
                );
                expect(store._state.symbol, 'Store to be enabled after subscriptions').to.equal(
                    LAZY_STORE_ENABLED_STATE,
                );

                unsubscribers[0]();
                expect(
                    store._state.symbol,
                    'Store to be enabled after first unsubscriptions',
                ).to.equal(LAZY_STORE_ENABLED_STATE);
                unsubscribers[1]();
                expect(
                    store._state.symbol,
                    'Store to be disabled after second unsubscriptions',
                ).to.equal(LAZY_STORE_DISABLED_STATE);
            });
            it('should return the concentrated values to a subscriber on subscription', function () {
                const [store, , sourceStoreValues] = createSimpleConcentratorStore();
                let subscribedValue: Readonly<typeof sourceStoreValues> | undefined = undefined;
                store.subscribe((value) => {
                    subscribedValue = value;
                });
                expect(subscribedValue).to.not.be.undefined;
                expect(subscribedValue).to.deep.equal(sourceStoreValues);
            });
            it('should update the subscribers with the new value when a source store updates', function () {
                const [store, sourceStores, sourceStoreValues] = createSimpleConcentratorStore();
                let subscribedValue: Readonly<typeof sourceStoreValues> | undefined = undefined;
                store.subscribe((value) => {
                    subscribedValue = value;
                });
                expect(subscribedValue).to.not.be.undefined;
                expect(subscribedValue).to.deep.equal(sourceStoreValues);

                sourceStores[0].set('Secondary Value');
                const newSourceStoreValues = getSourceStoresValues(sourceStores);
                expect(subscribedValue).to.deep.equal(newSourceStoreValues);
            });
        });
        describe('sourceStore subscriptions', function () {
            it("should throw when enabling the store and a source store doesn't return a value on subscription", function () {
                const faultySourceStore = new (class implements IQueryableStore<string> {
                    public subscribe(subscriber: StoreSubscriber<string>): StoreUnsubscriber {
                        return () => {
                            // No-op
                        };
                    }
                    public get(): string {
                        return '';
                    }
                })();

                const concentratorStore = new ConcentratorStore([faultySourceStore] as const);

                expect(() => concentratorStore.get()).to.throw(
                    'Source store values must be set after subscription phase. This is probably a bug in a source store!',
                );
            });
            it('should unsubscribe from sourceStores when disabling', function (done) {
                // Note: This test implicitely also tests wheter the sourceStore was only deactivated exactly once.
                const sourceStore = new ReadableStore('test', {
                    activator: () => () => {
                        done();
                    },
                });

                const store = new ExposedStateConcentratorStore([sourceStore] as const);

                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
                expect(store.get()).to.equal('test');
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
            });
            it('should throw when a sourceStore updates values on a disable store', function () {
                let sourceStoreSubscriber: StoreSubscriber<string> | undefined = undefined;
                const faultySourceStore = new (class implements IQueryableStore<string> {
                    public subscribe(subscriber: StoreSubscriber<string>): StoreUnsubscriber {
                        sourceStoreSubscriber = subscriber;
                        subscriber('Hi');
                        return () => {
                            // No-op
                        };
                    }
                    public get(): string {
                        return '';
                    }
                })();

                const store = new ExposedStateConcentratorStore([faultySourceStore] as const);
                const concentratorStoreUnsubscriber = store.subscribe(() => {
                    // No-op
                });
                expect(store._state.symbol).to.equal(LAZY_STORE_ENABLED_STATE);
                expect(sourceStoreSubscriber).to.not.be.undefined;
                concentratorStoreUnsubscriber();
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);

                expect(() => {
                    typeAssert(sourceStoreSubscriber !== undefined);
                    sourceStoreSubscriber('World!');
                }).to.throw(
                    'A source store subscription must not call a disabled concentrator store.',
                );
            });
        });
    });
}
