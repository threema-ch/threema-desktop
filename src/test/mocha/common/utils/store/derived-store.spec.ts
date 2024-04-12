import {expect} from 'chai';

import type {u32} from '~/common/types';
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
    DEFAULT_DERIVED_STORE_DISABLE_COOLDOWN_MS,
    DerivedStore,
    type AnyDerivedStoreOptions,
    type DeriveFunction,
} from '~/common/utils/store/derived-store';
import {TIMER} from '~/common/utils/timer';

type SourceStore = WritableStore<u32>;

function createSimpleDerivedStore(
    options?: AnyDerivedStoreOptions<{answer: string}>,
): readonly [
    derivedStore: DerivedStore<[SourceStore], Readonly<{answer: string}>>,
    sourceStores: SourceStore,
] {
    const sourceStore = new WritableStore(41);

    const derivedStore = new DerivedStore(
        [sourceStore],
        ([{currentValue: source}]) => ({
            answer: `is ${source + 1}`,
        }),
        options,
    );

    return [derivedStore, sourceStore];
}

type LayeredStore = WritableStore<{
    innerStore: SourceStore;
}>;

function createLayeredDerivedStore<TDerived>(
    deriveFunction: DeriveFunction<[LayeredStore], TDerived>,
): readonly [
    derivedStore: DerivedStore<[LayeredStore], TDerived>,
    sourceStore: LayeredStore,
    innerStore: SourceStore,
] {
    const innerStore = new WritableStore(42);
    const sourceStore = new WritableStore({
        innerStore,
    } as const);

    const derivedStore = new DerivedStore([sourceStore], deriveFunction);

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
                // @ts-expect-error: Private property
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
                expect(store.get()).to.deep.equal(EXPECTED);
            });
            it('should work when store was in enabled state', function () {
                const [store] = createSimpleDerivedStore();
                const unsubscriber = store.subscribe(() => {
                    // No-op
                });
                // @ts-expect-error: Private property
                expect(store._state.symbol).to.equal(LAZY_STORE_ENABLED_STATE);
                expect(store.get()).to.deep.equal(EXPECTED);
                // @ts-expect-error: Private property
                expect(store._state.symbol).to.equal(LAZY_STORE_ENABLED_STATE);
                unsubscriber();
            });
            it('should return the store to the disabled state', function () {
                const [store] = createSimpleDerivedStore();
                // @ts-expect-error: Private property
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
                expect(store.get()).to.deep.equal(EXPECTED);
                // @ts-expect-error: Private property
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
            });
        });

        describe('subscribe', function () {
            it('should enable the store on first subscription', function () {
                const [store] = createSimpleDerivedStore();
                const unsubscriber = store.subscribe(() => {
                    // No-op
                });
                // @ts-expect-error: Private property
                expect(store._state.symbol, 'Store to be enabled after subscriptions').to.equal(
                    LAZY_STORE_ENABLED_STATE,
                );
                unsubscriber();
            });
            it('should disable the store on last unsubscription per default', async function () {
                const [store] = createSimpleDerivedStore();
                // @ts-expect-error: Private property
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);

                const unsubscribers = [undefined, undefined].map(() =>
                    store.subscribe(() => {
                        // No-op
                    }),
                );
                // @ts-expect-error: Private property
                expect(store._state.symbol, 'Store to be enabled after subscriptions').to.equal(
                    LAZY_STORE_ENABLED_STATE,
                );

                unsubscribers[0]?.();
                expect(
                    // @ts-expect-error: Private property
                    store._state.symbol,
                    'Store to be enabled after first unsubscriptions',
                ).to.equal(LAZY_STORE_ENABLED_STATE);

                unsubscribers[1]?.();
                await TIMER.sleep(DEFAULT_DERIVED_STORE_DISABLE_COOLDOWN_MS).then(() => {
                    expect(
                        // @ts-expect-error: Private property
                        store._state.symbol,
                        'Store to be disabled after second unsubscriptions',
                    ).to.equal(LAZY_STORE_DISABLED_STATE);
                });
            }).timeout(DEFAULT_DERIVED_STORE_DISABLE_COOLDOWN_MS + 1000);
            it("should never disable the store if its mode is 'persistent'", function () {
                const [store] = createSimpleDerivedStore({subscriptionMode: 'persistent'});
                // @ts-expect-error: Private property
                expect(store._state.symbol).to.equal(
                    LAZY_STORE_ENABLED_STATE,
                    "Store with mode 'persistent' to be in enabled state as soon as it has been initialized",
                );

                const unsubscribers = [undefined].map(() =>
                    store.subscribe(() => {
                        // No-op
                    }),
                );
                expect(
                    // @ts-expect-error: Private property
                    store._state.symbol,
                    'Store to be enabled when it has subscribers',
                ).to.equal(LAZY_STORE_ENABLED_STATE);

                unsubscribers[0]?.();
                expect(
                    // @ts-expect-error: Private property
                    store._state.symbol,
                    'Store to still be enabled even after it has lost all its subscribers',
                ).to.equal(LAZY_STORE_ENABLED_STATE);
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

                const derivedStore = new DerivedStore([faultySourceStore], () => undefined);

                expect(() => derivedStore.get()).to.throw(
                    'Assertion failed, message: DerivedStore: Expected store value to be set after subscription. First callback after a subscription must run immediately!',
                );
            });
            it('should unsubscribe from sourceStore when disabling', function (done) {
                // Note: This test implicitely also tests wheter the sourceStore was only deactivated exactly once.
                const sourceStore = new ReadableStore('test', {
                    activator: () => () => {
                        done();
                    },
                });

                const store = new DerivedStore([sourceStore], () => undefined);

                // @ts-expect-error: Private property
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
                expect(store.get()).to.equal('test');
                // @ts-expect-error: Private property
                expect(store._state.symbol).to.equal(LAZY_STORE_DISABLED_STATE);
            });
            it('should throw when a sourceStore updates value on a disabled store', async function () {
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

                const store = new DerivedStore([faultySourceStore], () => undefined);
                const derivedStoreUnsubscriber = store.subscribe(() => {
                    // No-op
                });
                // @ts-expect-error: Private property
                expect(store._state.symbol).to.equal(LAZY_STORE_ENABLED_STATE);
                expect(sourceStoreSubscriber).to.not.be.undefined;

                derivedStoreUnsubscriber();
                await TIMER.sleep(DEFAULT_DERIVED_STORE_DISABLE_COOLDOWN_MS).then(() => {
                    expect(
                        // @ts-expect-error: Private property
                        store._state.symbol,
                        'Store to be disabled after unsubscriber is called',
                    ).to.equal(LAZY_STORE_DISABLED_STATE);
                });

                expect(() => {
                    typeAssert(sourceStoreSubscriber !== undefined);
                    sourceStoreSubscriber('World!');
                }).to.throw(
                    'Assertion failed, message: DerivedStore: A source store subscription must only call back to an enabled derived store',
                );
            }).timeout(DEFAULT_DERIVED_STORE_DISABLE_COOLDOWN_MS + 1000);
        });

        describe('getAndSubscribe', () => {
            it('should return the unwrapped store value', (done) => {
                const [derivedStore] = createLayeredDerivedStore(
                    ([{currentValue: source}], getAndSubscribe) => {
                        const value = getAndSubscribe(source.innerStore);
                        expect(value).to.equal(42);
                        done();
                    },
                );
                derivedStore.get();
            });
            it('should remove formerly subscribed unwrapped stores', () => {
                let unwrapActive = true;
                const [derivedStore, , innerStore] = createLayeredDerivedStore(
                    ([{currentValue: source}], getAndSubscribe) => {
                        if (unwrapActive) {
                            getAndSubscribe(source.innerStore);
                        }
                    },
                );
                derivedStore.subscribe(() => {
                    // No-op
                });
                unwrapActive = false;
                innerStore.set(24);

                // @ts-expect-error: Private property
                typeAssert(derivedStore._state.symbol === LAZY_STORE_ENABLED_STATE);
                expect(
                    // @ts-expect-error: Private property
                    derivedStore._state.additionalStoreSubscriptions.find(
                        (subscription) => subscription.ref === innerStore,
                    ),
                ).is.undefined;
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
                    ([{currentValue: source}], getAndSubscribe) => {
                        if (unwrapActive) {
                            getAndSubscribe(otherSourceStore);
                        }
                        getAndSubscribe(source.innerStore);
                    },
                );
                derivedStore.subscribe(() => {
                    // No-op
                });
                unwrapActive = false;
                innerStore.set(24);
            });
            it('should subscribe to new stores', (done) => {
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
                    ([{currentValue: source}], getAndSubscribe) => {
                        getAndSubscribe(source.innerStore);
                        if (newUnwrap) {
                            getAndSubscribe(otherSourceStore);
                        }
                    },
                );
                derivedStore.subscribe(() => {
                    // No-op
                });
                newUnwrap = true;
                innerStore.set(24);
            });
            it('should trigger a new derivation on an update of any additional store', () => {
                const [derivedStore, , innerStore] = createLayeredDerivedStore(
                    ([{currentValue: source}], getAndSubscribe) =>
                        getAndSubscribe(source.innerStore) + 1,
                );
                const unsubscriber = derivedStore.subscribe(() => {
                    // No-op
                });
                innerStore.set(24);

                expect(derivedStore.get()).to.equal(25);

                unsubscriber();
            });
            it('should unsubscribe from all additional store subscriptions if the store gets disabled', (done) => {
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

                const [derivedStore] = createLayeredDerivedStore((source, getAndSubscribe) => {
                    getAndSubscribe(otherSourceStore);
                });
                derivedStore.get();
            });
        });
    });
}
