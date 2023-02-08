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
import {DerivedStore, type DeriveFunction, type States} from '~/common/utils/store/derived-store';

class ExposedDerivedStore<
    TSourceStore extends IQueryableStore<unknown>,
    TDerivedValue extends TOutDerivedValue,
    TOutDerivedValue = TDerivedValue,
> extends DerivedStore<TSourceStore, TDerivedValue, TOutDerivedValue> {
    public declare _sourceStore: TSourceStore;
    public declare _state: States<TSourceStore, TDerivedValue, TOutDerivedValue>;
}

type SourceStore = WritableStore<u32>;

function createSimpleDerivedStore(): readonly [
    derivedStore: ExposedDerivedStore<SourceStore, Readonly<{answer: string}>>,
    sourceStore: SourceStore,
] {
    const sourceStore = new WritableStore(41);

    const derivedStore = new ExposedDerivedStore(sourceStore, (source) => ({
        answer: `is ${source + 1}`,
    }));
    return [derivedStore, sourceStore];
}

type LayeredStore = WritableStore<{
    innerStore: SourceStore;
}>;

function createLayeredDerivedStore<TDerived>(
    deriveFunction: DeriveFunction<LayeredStore, TDerived>,
): readonly [
    derivedStore: ExposedDerivedStore<LayeredStore, TDerived>,
    sourceStore: LayeredStore,
    innerStore: SourceStore,
] {
    const innerStore = new WritableStore(42);
    const sourceStore = new WritableStore({
        innerStore,
    } as const);

    const derivedStore = new ExposedDerivedStore(sourceStore, deriveFunction);

    return [derivedStore, sourceStore, innerStore];
}

const EXPECTED = {answer: 'is 42' as string} as const;

/**
 * Test of random utils.
 */
export function run(): void {
    describe('DerivedStore', function () {
        describe('get', function () {
            it('should return the derived value', function () {
                const [store] = createSimpleDerivedStore();
                expect(store.get()).to.deep.equal(EXPECTED);
            });
            it('should work when store was in disabled state', function () {
                const [store] = createSimpleDerivedStore();
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
                expect(store.get()).to.deep.equal(EXPECTED);
            });
            it('should work when store was in enabled state', function () {
                const [store] = createSimpleDerivedStore();
                const unsubscriber = store.subscribe(() => {
                    // No-op
                });
                expect(store._state.symbol).to.equal(LAZY_STORE_ENABLED_STATE);
                expect(store.get()).to.deep.equal(EXPECTED);
                expect(store._state.symbol).to.equal(LAZY_STORE_ENABLED_STATE);
                unsubscriber();
            });
            it('should return the store to the disabled state', function () {
                const [store] = createSimpleDerivedStore();
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
                expect(store.get()).to.deep.equal(EXPECTED);
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
            });
        });

        describe('subscribe', function () {
            it('should enable the store on first subscription', function () {
                const [store] = createSimpleDerivedStore();
                const unsubscriber = store.subscribe(() => {
                    // No-op
                });
                expect(store._state.symbol, 'Store to be enabled after subscriptions').to.equal(
                    LAZY_STORE_ENABLED_STATE,
                );
                unsubscriber();
            });
            it('should disable the store on last unsubscription', function () {
                const [store] = createSimpleDerivedStore();
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
            it('should return the derived values to a subscriber on subscription', function () {
                const [store] = createSimpleDerivedStore();
                let subscribedValue: Readonly<typeof EXPECTED> | undefined = undefined;
                store.subscribe((value) => {
                    subscribedValue = value;
                });
                expect(subscribedValue).to.not.be.undefined;
                expect(subscribedValue).to.deep.equal(EXPECTED);
            });
            it('should update the derivation with the new value when the source store updates', function () {
                const [store, sourceStore] = createSimpleDerivedStore();
                let subscribedValue: Readonly<typeof EXPECTED> | undefined = undefined;
                store.subscribe((value) => {
                    subscribedValue = value;
                });
                expect(subscribedValue).to.not.be.undefined;
                expect(subscribedValue).to.deep.equal(EXPECTED);

                sourceStore.set(1336);
                const newSourceStoreValues = {answer: 'is 1337' as string} as const;
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

                const derivedStore = new DerivedStore(faultySourceStore, () => undefined);

                expect(() => derivedStore.get()).to.throw(
                    'Assertion failed, message: Source store value must be set after subscription. This is probably a bug in a source store!',
                );
            });
            it('should unsubscribe from sourceStore when disabling', function (done) {
                // Note: This test implicitely also tests wheter the sourceStore was only deactivated exactly once.
                const sourceStore = new ReadableStore('test', {
                    activator: () => () => {
                        done();
                    },
                });

                const store = new ExposedDerivedStore(sourceStore, () => undefined);

                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
                expect(store.get()).to.equal('test');
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
            });
            it('should throw when a sourceStore updates value on a disable store', function () {
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

                const store = new ExposedDerivedStore(faultySourceStore, () => undefined);
                const derivedStoreUnsubscriber = store.subscribe(() => {
                    // No-op
                });
                expect(store._state.symbol).to.equal(LAZY_STORE_ENABLED_STATE);
                expect(sourceStoreSubscriber).to.not.be.undefined;
                derivedStoreUnsubscriber();
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);

                expect(() => {
                    typeAssert(sourceStoreSubscriber !== undefined);
                    sourceStoreSubscriber('World!');
                }).to.throw(
                    'Assertion failed, message: A source store subscription may not call an disabled derived store.',
                );
            });
        });

        describe('replaceSourceStore', function () {
            it('should replace the sourceStore with the new sourceStore', function () {
                const [derivedStore] = createSimpleDerivedStore();
                const newSourceStore = new WritableStore(42);
                derivedStore.replaceSourceStore(newSourceStore);
                expect(derivedStore._sourceStore).to.equal(newSourceStore);
            });
            it('should keep the previous derivedValueStore', function () {
                const [derivedStore] = createSimpleDerivedStore();
                const derivedStoreUnsubscriber = derivedStore.subscribe(() => {
                    // No-op
                });
                expect(derivedStore._state.symbol).to.equal(LAZY_STORE_ENABLED_STATE);
                typeAssert(derivedStore._state.symbol === LAZY_STORE_ENABLED_STATE);

                const previousDerivedStore = derivedStore._state.derivedValueStore;
                const newSourceStore = new WritableStore(42);
                derivedStore.replaceSourceStore(newSourceStore);
                expect(derivedStore._state.derivedValueStore).to.equal(previousDerivedStore);
                derivedStoreUnsubscriber();
            });
            it('should replace the sourceStoreUnsubscriber', function () {
                const [derivedStore] = createSimpleDerivedStore();
                const derivedStoreUnsubscriber = derivedStore.subscribe(() => {
                    // No-op
                });
                expect(derivedStore._state.symbol).to.equal(LAZY_STORE_ENABLED_STATE);
                typeAssert(derivedStore._state.symbol === LAZY_STORE_ENABLED_STATE);
                const oldUnsubscriber = derivedStore._state.unsubscriber;
                const newSourceStore = new WritableStore(42);
                derivedStore.replaceSourceStore(newSourceStore);
                expect(derivedStore._state.unsubscriber).to.not.equal(oldUnsubscriber);
                derivedStoreUnsubscriber();
            });
            it('should unsubscribe from the old sourceStore', function (done) {
                const oldSourceStore = new (class implements IQueryableStore<string> {
                    public subscribe(subscriber: StoreSubscriber<string>): StoreUnsubscriber {
                        subscriber('ok');
                        return () => {
                            done();
                        };
                    }
                    public get(): string {
                        return '';
                    }
                })();
                const derivedStore = new ExposedDerivedStore(oldSourceStore, () => undefined);
                const derivedStoreUnsubscriber = derivedStore.subscribe(() => {
                    // No-op
                });
                const newSourceStore = new WritableStore('aha');
                derivedStore.replaceSourceStore(newSourceStore);
                derivedStoreUnsubscriber();
            });
            it('derive updates from the new sourceStore and update subscribers', function (done) {
                const [derivedStore] = createSimpleDerivedStore();
                const derivedStoreUnsubscriber = derivedStore.subscribe((value) => {
                    const expectedSecondValue = {
                        answer: `is 43`,
                    };
                    if (value.answer !== EXPECTED.answer) {
                        expect(value).to.deep.equal(expectedSecondValue);
                        done();
                    }
                });
                const newSourceStore = new WritableStore(42);
                derivedStore.replaceSourceStore(newSourceStore);
                derivedStoreUnsubscriber();
            });
        });

        describe('unwrapAndSubscribe', () => {
            it('should return the unwrapped store value', (done) => {
                const [derivedStore] = createLayeredDerivedStore((source, unwrapAndSubscribe) => {
                    const value = unwrapAndSubscribe(source.innerStore);
                    expect(value).to.equal(42);
                    done();
                });
                derivedStore.get();
            });
            it('should remove formerly subscribed unwraped stores', () => {
                let unwrapActive = true;
                const [derivedStore, , innerStore] = createLayeredDerivedStore(
                    (source, unwrapAndSubscribe) => {
                        if (unwrapActive) {
                            unwrapAndSubscribe(source.innerStore);
                        }
                    },
                );
                derivedStore.subscribe(() => {
                    // No-op
                });
                unwrapActive = false;
                innerStore.set(24);

                typeAssert(derivedStore._state.symbol === LAZY_STORE_ENABLED_STATE);
                expect(derivedStore._state.unwrappedStoreSubscriptions.get(innerStore)).is
                    .undefined;
            });
            it('should call unsubscribe of formerly subscribed stores', function (done) {
                let unwrapActive = true;
                const otherSourceStore = new (class implements IQueryableStore<string> {
                    public subscribe(subscriber: StoreSubscriber<string>): StoreUnsubscriber {
                        subscriber('');
                        return () => {
                            done();
                        };
                    }
                    public get(): string {
                        return '';
                    }
                })();
                const [derivedStore, , innerStore] = createLayeredDerivedStore(
                    (source, unwrapAndSubscribe) => {
                        if (unwrapActive) {
                            unwrapAndSubscribe(otherSourceStore);
                        }
                        unwrapAndSubscribe(source.innerStore);
                    },
                );
                derivedStore.subscribe(() => {
                    // No-op
                });
                unwrapActive = false;
                innerStore.set(24);
            });
            it('should subscribe to new unwrapped stores', (done) => {
                let newUnwrap = false;
                const otherSourceStore = new (class implements IQueryableStore<string> {
                    public subscribe(): StoreUnsubscriber {
                        done();
                        return () => {
                            // No-op
                        };
                    }
                    public get(): string {
                        return '';
                    }
                })();
                const [derivedStore, , innerStore] = createLayeredDerivedStore(
                    (source, unwrapAndSubscribe) => {
                        unwrapAndSubscribe(source.innerStore);
                        if (newUnwrap) {
                            unwrapAndSubscribe(otherSourceStore);
                        }
                    },
                );
                derivedStore.subscribe(() => {
                    // No-op
                });
                newUnwrap = true;
                innerStore.set(24);
            });
            it('should trigger a new derivation on an update of any unwrapped store', () => {
                const [derivedStore, , innerStore] = createLayeredDerivedStore(
                    (source, unwrapAndSubscribe) => unwrapAndSubscribe(source.innerStore) + 1,
                );
                const unsubscriber = derivedStore.subscribe(() => {
                    // No-op
                });
                innerStore.set(24);

                expect(derivedStore.get()).to.equal(25);

                unsubscriber();
            });
            it('should unsubscribe from all unwrapped store subscriptions if the store gets disabled', (done) => {
                const otherSourceStore = new (class implements IQueryableStore<string> {
                    public subscribe(subscriber: StoreSubscriber<string>): StoreUnsubscriber {
                        subscriber('');
                        return () => {
                            done();
                        };
                    }
                    public get(): string {
                        return '';
                    }
                })();

                const [derivedStore] = createLayeredDerivedStore((source, unwrapAndSubscribe) => {
                    unwrapAndSubscribe(otherSourceStore);
                });
                derivedStore.get();
            });
        });
    });
}
