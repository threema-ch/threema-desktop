import {expect} from 'chai';

import {type DatabaseBackend, type DbContactUid} from '~/common/db';
import {InMemoryDatabaseBackend} from '~/common/db/in-memory';
import {NOOP_LOGGER} from '~/common/logging';
import {assert} from '~/common/utils/assert';
import {backendTests, makeContact} from '~/test/mocha/common/db-backend-tests';

function initInMemoryBackend(): [backend: InMemoryDatabaseBackend, cleanup: () => void] {
    const backend = new InMemoryDatabaseBackend(NOOP_LOGGER);
    return [
        backend,
        (): void => {
            // No-op
        },
    ];
}

/**
 * In-memory database backend tests.
 */
export function run(): void {
    describe('InMemoryDatabaseBackend', function () {
        describe('In-Memory specific', function () {
            let db: InMemoryDatabaseBackend;
            let cleanup: () => void;

            this.beforeEach(function () {
                [db, cleanup] = initInMemoryBackend();
            });
            this.afterEach(() => cleanup());

            it('self-test', function () {
                // Contact doesn't exist
                expect(db.getContactByUid(0n as DbContactUid)).to.be.undefined;

                // Create contact
                const uid = makeContact(db, {});

                // Fetch contact
                const contact = db.getContactByUid(uid);
                expect(contact).not.to.be.undefined;
                assert(contact !== undefined);
                expect(contact.uid).to.equal(uid);
            });
        });

        describe('Backend agnostic', function () {
            // Load generic backend tests
            backendTests.bind(this)(
                {
                    supportsForeignKeyConstraints: false,
                    doesNotImplementThreadIdTodoRemoveThis: true,
                    doesNotImplementFileDataCleanup: true,
                },
                initInMemoryBackend as () => [backend: DatabaseBackend, cleanup: () => void],
            );
        });
    });
}
