import {type Database} from 'better-sqlcipher';
import {expect} from 'chai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import process from 'process';

import {type DatabaseBackend, type DbContactUid, wrapRawDatabaseKey} from '~/common/db';
import {NOOP_LOGGER} from '~/common/logging';
import {SqliteDatabaseBackend} from '~/common/node/db/sqlite';
import {assert} from '~/common/utils/assert';
import {backendTests} from '~/test/mocha/common/db-backend-tests';

/**
 * Create and return a temporary directory.
 * (Warning: This directory is visible and readable for other processes!)
 */
function getTempDir(): string {
    const tempDirRoot = fs.realpathSync(os.tmpdir());
    const tempDir = fs.mkdtempSync(path.join(tempDirRoot, 'threema-desktop-'));
    return tempDir;
}

function initSqliteBackend(): [backend: SqliteDatabaseBackend, cleanup: () => void] {
    // Instantiate backend
    let dbPath: string;
    let tmpDir: string | undefined;
    // Note: Don't use dot notation below, see https://stackoverflow.com/a/72403165/284318
    // eslint-disable-next-line dot-notation
    const testDatabaseMode = process.env['TEST_DATABASE'] ?? 'in-memory';
    switch (testDatabaseMode) {
        case 'in-memory':
            dbPath = ':memory:';
            break;
        case 'tempfile':
            tmpDir = getTempDir();
            dbPath = path.join(tmpDir, 'test.db');
            break;
        default:
            throw new Error(
                `Invalid database mode: ${testDatabaseMode}. Possible values: in-memory|tempfile`,
            );
    }
    const dbKey = wrapRawDatabaseKey(new Uint8Array(32));
    const backend = SqliteDatabaseBackend.create(NOOP_LOGGER, dbPath, dbKey);

    // Run migrations
    backend.runMigrations();

    // Return backend plus a cleanup function
    return [
        backend,
        (): void => {
            if (tmpDir !== undefined) {
                fs.rmSync(tmpDir, {recursive: true});
            }
        },
    ];
}

/**
 * SQLite database backend tests.
 */
export function run(): void {
    describe('SqliteDatabaseBackend', function () {
        describe('SQLite specific', function () {
            let db: SqliteDatabaseBackend;
            let cleanup: () => void;

            this.beforeEach(function () {
                [db, cleanup] = initSqliteBackend();
            });
            this.afterEach(() => cleanup());

            it('should complete the self-test', function () {
                // Run self-test
                db.selftest();
            });

            /**
             * SQlite should store datetimes as millisecond timestamps.
             */
            it('should store dates as timestamps', function () {
                const timestamp = 1568906580000; //  2019-09-19 17:23:00

                // Create a contact using raw SQL (so we can control the storage format)
                // @ts-expect-error: Private property
                (db._rawDb as Database).exec(`
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
                initSqliteBackend as () => [backend: DatabaseBackend, cleanup: () => void],
            );
        });
    });
}
