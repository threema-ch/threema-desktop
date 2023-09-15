import {expect} from 'chai';

import {ensureNonce, isNonce, NACL_CONSTANTS, type Nonce, type NonceHash} from '~/common/crypto';
import {
    hashNonce,
    NONCE_REUSED,
    NonceGuard,
    NonceRegistry,
    NonceService,
    type ServicesForNonceService,
} from '~/common/crypto/nonce';
import {randomU64} from '~/common/crypto/random';
import {type DbNonceUid} from '~/common/db';
import {NonceScope, NonceScopeUtils} from '~/common/enum';
import {type Logger} from '~/common/logging';
import {assert} from '~/common/utils/assert';
import {byteEquals, bytesToHex} from '~/common/utils/byte';
import {ResolvablePromise} from '~/common/utils/resolvable-promise';
import {GlobalTimer} from '~/common/utils/timer';
import {makeTestServices, makeTestUser} from '~/test/mocha/common/backend-mocks';

function getRandomUid({crypto}: Pick<ServicesForNonceService, 'crypto'>): DbNonceUid {
    return randomU64(crypto) as DbNonceUid;
}

export function expectSameNonceHashes(actual: NonceHash[], expected: NonceHash[]): Chai.Assertion {
    expect(actual.length).to.equal(expected.length);
    return expect(actual.map((h) => bytesToHex(h))).to.have.same.members(
        expected.map((h) => bytesToHex(h)),
    );
}

class FakeLoggingFactory {
    public readonly prefix = undefined;
    public logger(tag: string, style?: string): Logger {
        return this;
    }

    public trace(...data: unknown[]): void {
        /* No-op */
    }

    public debug(...data: unknown[]): void {
        /* No-op */
    }

    public info(...data: unknown[]): void {
        /* No-op */
    }

    public warn(...data: unknown[]): void {
        /* No-op */
    }

    public error(...data: unknown[]): void {
        /* No-op */
    }

    public assert(condition: boolean, ...data: readonly unknown[]): asserts condition {
        assert(condition);
    }
}

/**
 * Test of nonc service and component.
 */
export function run(): void {
    const me = makeTestUser('MEMEMEME');
    let services: ServicesForNonceService;

    function makeServices(): ServicesForNonceService {
        const partialServices = makeTestServices(me.identity.string);

        const nonces: {[T in NonceScope]: Set<NonceHash>} = {
            [NonceScope.CSP]: new Set(),
            [NonceScope.D2D]: new Set(),
        };

        return {
            ...partialServices,
            db: {
                addNonce: (scope, value) => {
                    nonces[scope].add(value);
                    return getRandomUid(partialServices);
                },
                getAllNonces: (scope) => [...nonces[scope]],
                hasNonce: (scope, value) =>
                    [...nonces[scope]].some((nonce) => byteEquals(nonce, value))
                        ? getRandomUid(partialServices)
                        : undefined,
                addNonces: (scope: NonceScope, noncesList: NonceHash[]) => {
                    for (const nonce of noncesList) {
                        nonces[scope].add(nonce);
                    }
                    return noncesList.length;
                },
            },
        };
    }

    function makeRandomNonce(): Nonce {
        return ensureNonce(
            services.crypto.randomBytes(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH)),
        );
    }

    describe('NonceGuard', function () {
        function makeNonceGuard(): NonceGuard {
            const scope = NonceScope.CSP;
            const nonce = ensureNonce(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH));
            return new NonceGuard(services, scope, nonce, me.identity);
        }

        it('nonce value cannot be accessed after beeing processed', function () {
            services = makeServices();
            const guard = makeNonceGuard();
            guard.discard();

            expect(guard.processed.value).to.be.true;
            expect(() => guard.nonce).to.throw();
        });

        it('commit marks nonce as processed', function () {
            services = makeServices();
            const guard = makeNonceGuard();
            guard.commit();
            expect(guard.processed.value).to.be.true;
        });
        it('commit cannot be called after beeing processed', function () {
            services = makeServices();
            const guard = makeNonceGuard();
            guard.discard();
            expect(() => guard.commit()).to.throw();
        });
        it('commit persists scope,nonce to database', function () {
            services = makeServices();
            const guard = makeNonceGuard();
            const {scope, nonce} = guard;
            guard.commit();
            expect(services.db.hasNonce(scope, hashNonce(me.identity, nonce))).to.not.be.undefined;
        });

        it('discard marks nonce as processed', function () {
            services = makeServices();
            const guard = makeNonceGuard();
            guard.commit();
            expect(guard.processed.value).to.be.true;
        });
        it('discard cannot be called after beeing processed', function () {
            services = makeServices();
            const guard = makeNonceGuard();
            guard.commit();
            expect(() => guard.discard()).to.throw();
        });
        it('discard does not persist scope,nonce to database', function () {
            services = makeServices();
            const guard = makeNonceGuard();
            const {scope, nonce} = guard;
            guard.discard();
            expect(services.db.hasNonce(scope, hashNonce(me.identity, nonce))).to.be.undefined;
        });
    });
    describe('NonceRegistry', function () {
        function makeServicesRegistry(): NonceRegistry {
            services = makeServices();
            return new NonceRegistry(services, me.identity);
        }
        describe('checkAndRegisterNonce', function () {
            it('returns a nonce guard for a unused scope/nonce', function () {
                const registry = makeServicesRegistry();
                const nonce = makeRandomNonce();

                const guard = registry.checkAndRegisterNonce(NonceScope.CSP, nonce);
                expect(guard).to.be.instanceOf(NonceGuard);
                assert(guard instanceof NonceGuard);
                expect(guard.nonce).to.deep.equal(nonce);
            });

            it('returns a token if nonce was commited before', function () {
                const registry = makeServicesRegistry();
                const nonce = [NonceScope.CSP, makeRandomNonce()] as const;

                const guard = registry.checkAndRegisterNonce(...nonce);
                expect(guard).to.be.instanceOf(NonceGuard);
                assert(guard instanceof NonceGuard);
                guard.commit();

                const token = registry.checkAndRegisterNonce(...nonce);
                expect(token).to.equal(NONCE_REUSED);
            });

            it('correctly checks whether a nonce was used from memory', function () {
                const registry = makeServicesRegistry();
                const nonce = [NonceScope.CSP, makeRandomNonce()] as const;

                const guard = registry.checkAndRegisterNonce(...nonce);
                expect(guard).to.be.instanceOf(NonceGuard);

                const token = registry.checkAndRegisterNonce(...nonce);
                expect(token).to.equal(NONCE_REUSED);
            });

            it('correctly checks whether a nonce was used from database', function () {
                const registry = makeServicesRegistry();
                const nonce = [NonceScope.CSP, makeRandomNonce()] as const;
                services.db.addNonce(nonce[0], hashNonce(me.identity, nonce[1]));

                const token = registry.checkAndRegisterNonce(...nonce);
                expect(token).to.equal(NONCE_REUSED);
            });
        });

        it('logs an error if not all registered nonces were processed', async function () {
            // NOTE: This test depends on the behaviour of the garbage collector. On VP8, it should
            // be stable as long as global.gc() behaves as intended.
            assert(
                global.gc !== undefined,
                'Please expose the `global.gc` interface with node option `--expose-gc`',
            );

            const loggedError = new ResolvablePromise<string>();
            const logging = new (class extends FakeLoggingFactory {
                public override error(...data: unknown[]): void {
                    loggedError.resolve(data[0] as string);
                }
            })();

            services = {...makeServices(), logging};
            const registry = new NonceRegistry(services, me.identity);

            // Make sure the guard lives only in another scope
            function registerNonce(): void {
                const guard = registry.checkAndRegisterNonce(NonceScope.CSP, makeRandomNonce());
                assert(guard !== NONCE_REUSED);
            }
            registerNonce();

            // Break the current event loop execution to free the nonce for gc
            await new GlobalTimer().sleep(0);
            // Force Garbage Collection
            global.gc();

            expect(await loggedError).to.equal(
                'NonceGuard that was not yet processed was garbage collected!',
            );
        });
    });
    describe('NonceService', function () {
        function makeNonceServiceWithFakeRegistry(
            checkAndRegisterNonce = (scope: NonceScope, nonce: Nonce) =>
                new NonceGuard(services, scope, nonce, me.identity),
        ): NonceService {
            return new NonceService(services, me.identity, {
                checkAndRegisterNonce,
            });
        }

        describe('hashNonce', function () {
            it('hashes a nonce correctly with sha256 and the identity as key', function () {
                const nonce = ensureNonce(new Uint8Array(NACL_CONSTANTS.NONCE_LENGTH).fill(42));
                const referenceHash = Uint8Array.from([
                    74, 175, 105, 228, 197, 151, 54, 176, 85, 218, 96, 17, 121, 37, 19, 18, 218,
                    195, 248, 91, 106, 54, 192, 109, 8, 208, 79, 157, 201, 238, 117, 230,
                ]);

                const hash = hashNonce(me.identity, nonce);
                expect(hash).to.be.deep.equal(referenceHash);
            });
        });

        describe('getAllPersistedNonces', function () {
            it('gets all persisted nonces from a specific scope from database', function () {
                services = makeServices();
                const service = makeNonceServiceWithFakeRegistry();

                for (const scope of NonceScopeUtils.ALL) {
                    const generatedNonces = Array(5)
                        .fill(undefined)
                        .map(() => makeRandomNonce())
                        .map((nonce) => hashNonce(me.identity, nonce));

                    for (const nonce of generatedNonces) {
                        services.db.addNonce(scope, nonce);
                    }

                    const persistedNonces = service.getAllPersistedNonces(scope);
                    expectSameNonceHashes([...persistedNonces], generatedNonces);
                }
            });
        });

        describe('importNonces', function () {
            it('imports all passed nonces from a specific scope to database', function () {
                services = makeServices();
                const service = makeNonceServiceWithFakeRegistry();

                for (const scope of NonceScopeUtils.ALL) {
                    const length = 5;
                    const generatedNonces = Array(length)
                        .fill(undefined)
                        .map(() => makeRandomNonce())
                        .map((nonce) => hashNonce(me.identity, nonce));

                    for (const nonce of generatedNonces) {
                        services.db.addNonce(scope, nonce);
                    }

                    service.importNonces(scope, new Set(generatedNonces));
                    const persistedNonces = services.db.getAllNonces(scope);
                    expectSameNonceHashes(persistedNonces, generatedNonces);
                }
            });
        });
        describe('checkAndRegisterNonce', () => {
            it('checks and registers the nonce in the NonceRegistry', function () {
                services = makeServices();
                const service = new NonceService(services, me.identity);
                const nonce = [NonceScope.D2D, makeRandomNonce()] as const;

                const guard = service.checkAndRegisterNonce(...nonce);
                expect(guard).to.be.instanceOf(NonceGuard);
                assert(guard instanceof NonceGuard);

                guard.discard();
            });
            it('returns the NONCE_REUSED token if the nonce was checked before', function () {
                services = makeServices();
                const service = new NonceService(services, me.identity);
                const nonce = [NonceScope.D2D, makeRandomNonce()] as const;

                const guard = service.checkAndRegisterNonce(...nonce);
                expect(guard).to.be.instanceOf(NonceGuard);
                assert(guard instanceof NonceGuard);

                const token = service.checkAndRegisterNonce(...nonce);
                expect(token).to.equal(NONCE_REUSED);

                guard.discard();
            });
        });

        describe('getRandomNonce', () => {
            it('returns a nonceguard with a random nonce.', function () {
                services = makeServices();
                const service = new NonceService(services, me.identity);
                // eslint-disable-next-line @typescript-eslint/require-await
                const nonce = service.getRandomNonce(NonceScope.D2D);
                expect(isNonce(nonce.nonce), 'nonceguard holds a valid, unconsumed nonce');
                nonce.commit();
            });
            it('registers and checks the nonce in the NonceRegistry', async function () {
                services = makeServices();

                type NonceTuple = [scope: NonceScope, nonce: Nonce];
                const registration = new ResolvablePromise<NonceTuple>();
                const functionInput = new ResolvablePromise<NonceTuple>();
                function checkAndRegisterNonce(...params: NonceTuple): NonceGuard {
                    registration.resolve(params);
                    console.log('Some nonce was registered.');
                    return new NonceGuard(services, ...params, me.identity);
                }

                const scope = NonceScope.D2D;
                const service = makeNonceServiceWithFakeRegistry(checkAndRegisterNonce);
                const guard = service.getRandomNonce(scope);
                const guardValues: NonceTuple = [scope, guard.nonce];
                guard.discard();
                functionInput.resolve(guardValues);
                expect(await registration).to.deep.equal(await functionInput);
            });
        });
    });
}
