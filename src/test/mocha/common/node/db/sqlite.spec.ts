import {expect} from 'chai';

import {type DbContactUid} from '~/common/db';
import {NOOP_LOGGER} from '~/common/logging';
import {type SqliteDatabaseBackend} from '~/common/node/db/sqlite';
import {assert} from '~/common/utils/assert';
import {initSqliteBackend} from '~/test/mocha/common/backend-mocks';
import {backendTests} from '~/test/mocha/common/db-backend-tests';

/**
 * SQLite database backend tests.
 */
export function run(): void {
    describe('SqliteDatabaseBackend', function () {
        describe('SQLite specific', function () {
            let db: SqliteDatabaseBackend;
            this.beforeEach(() => {
                db = initSqliteBackend(NOOP_LOGGER);
            });

            it('should complete the self-test', function () {
                // Run self-test
                db.checkIntegrity();
            });

            /**
             * SQlite should store datetimes as millisecond timestamps.
             */
            it('should store dates as timestamps', function () {
                const timestamp = 1568906580000; //  2019-09-19 17:23:00

                // Create a contact using raw SQL (so we can control the storage format)
                // @ts-expect-error: Private property
                db._rawDb.exec(`
                    INSERT INTO contacts(uid, identity, publicKey, createdAt, identityType)
                    VALUES (
                        1000,
                        'TESTTEST',
                        X'0000000000000000111111111111111122222222222222223333333333333333',
                        ${timestamp},
                        0
                    );
                `);

                // Fetch contact
                const contact = db.getContactByUid(1000n as DbContactUid);
                expect(contact).not.to.be.undefined;
                assert(contact !== undefined); // Make TS happy

                // Validate date
                expect(contact.createdAt.getTime()).to.equal(timestamp);
            });
        });

        describe('Backend agnostic', function () {
            // Load generic backend tests
            backendTests.bind(this)(
                {
                    supportsForeignKeyConstraints: true,
                },
                () => initSqliteBackend(NOOP_LOGGER),
            );
        });
    });
}
