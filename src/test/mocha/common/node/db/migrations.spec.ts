import {expect} from 'chai';

import DatabaseConstructor, {type Database} from 'better-sqlcipher';
import {type Logger, NOOP_LOGGER} from '~/common/logging';
import {ensureIdentityString} from '~/common/network/types';
import {MigrationHelper} from '~/common/node/db/migrations';
import type {u53} from '~/common/types';
import {assert, unwrap} from '~/common/utils/assert';

// Should match the values in `migrations.ts`: If we (accidentally or on purpose) change the name of
// a column in `migrations.ts` that will break existing apps with an existing database table.
// Writing out the values here again ensures that a test fails if this happens, alerting the
// developer to make a concious decision.
const MIGRATION_CACHE = {
    TABLE_NAME: '_threema_migration_cache',
    COL_NUMBER: 'number',
    COL_NAME: 'name',
    COL_UP_SQL: 'upSql',
    COL_DOWN_SQL: 'downSql',
    COL_APPLIED_AT: 'appliedAt',
} as const;

/**
 * SQLite database backend tests.
 */
export function run(): void {
    describe('Migrations', function () {
        // Setup: Create empty database
        let db: Database;
        let migrationHelper: MigrationHelper;
        const log: Logger = NOOP_LOGGER;
        this.beforeEach(() => {
            db = new DatabaseConstructor(':memory:');
            migrationHelper = MigrationHelper.create(log, {
                userIdentity: ensureIdentityString('MEMEMEME'),
            });
        });
        this.afterEach(() => {
            db.close();
        });

        // Helper functions
        function tableExists(database: Database, tableName: string): boolean {
            return (
                database
                    .prepare<
                        [],
                        {readonly count: u53}
                    >(`SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='${tableName}'`)
                    .get()?.count === 1
            );
        }
        function migrationCacheEntryCount(database: Database): u53 {
            return unwrap(
                database
                    .prepare<
                        [],
                        {readonly count: u53}
                    >(`SELECT COUNT(*) AS count FROM ${MIGRATION_CACHE.TABLE_NAME}`)
                    .get()?.count,
                'Missing count',
            );
        }
        function currentDbVersion(database: Database): u53 {
            return Number(db.pragma('user_version', {simple: true}));
        }

        it('does nothing when migrating to version 0', () => {
            const applied = migrationHelper.migrate(db, 0);
            expect(applied).to.equal(0);
        });

        it('does nothing when no migrations are available', () => {
            // Remove migrations
            // @ts-expect-error: Unsafe usage of private property
            migrationHelper._migrations = new Map();
            // @ts-expect-error: Unsafe usage of private property
            migrationHelper._maxEmbeddedMigrationNumber = 0;

            const applied = migrationHelper.migrate(db, 0);
            expect(applied).to.equal(0);
        });

        it('errors when up migration not found', () => {
            // @ts-expect-error: Unsafe usage of private property
            const maxMigrationAvailable: u53 = migrationHelper._maxEmbeddedMigrationNumber;
            expect(() => migrationHelper.migrate(db, Number.MAX_SAFE_INTEGER)).to.throw(
                `Could not find migration for version ${maxMigrationAvailable + 1}`,
            );
        });

        it('creates a migration table when migrations are applied', () => {
            expect(tableExists(db, MIGRATION_CACHE.TABLE_NAME)).to.be.false;
            migrationHelper.migrate(db, 0);
            expect(tableExists(db, MIGRATION_CACHE.TABLE_NAME)).to.be.false;
            migrationHelper.migrate(db, 1);
            expect(tableExists(db, MIGRATION_CACHE.TABLE_NAME)).to.be.true;
        });

        it('stores migrations in migration cache', () => {
            const applied = migrationHelper.migrate(db, 2);
            expect(applied).to.equal(2);
            expect(tableExists(db, MIGRATION_CACHE.TABLE_NAME)).to.be.true;
            interface MigrationCacheRow {
                readonly [MIGRATION_CACHE.COL_NUMBER]: u53;
                readonly [MIGRATION_CACHE.COL_UP_SQL]: string;
                readonly [MIGRATION_CACHE.COL_DOWN_SQL]: string;
            }
            const migrations = db
                .prepare<[], MigrationCacheRow>(
                    `SELECT ${MIGRATION_CACHE.COL_NUMBER}, ${MIGRATION_CACHE.COL_UP_SQL}, ${MIGRATION_CACHE.COL_DOWN_SQL}
                    FROM ${MIGRATION_CACHE.TABLE_NAME}
                    ORDER BY number asc`,
                )
                .all();
            expect(migrations.map((m) => m.number)).to.deep.equal([1, 2]);
            assert(migrations[0] !== undefined);
            expect(migrations[0].upSql).not.to.be.empty;
            expect(migrations[0].downSql).not.to.be.empty;
            expect(migrations[0].upSql).not.to.equal(migrations[0].downSql);
            assert(migrations[1] !== undefined);
            expect(migrations[1].upSql).not.to.be.empty;
            expect(migrations[1].downSql).not.to.be.empty;
            expect(migrations[1].upSql).not.to.equal(migrations[1].downSql);
        });

        it('overwrites existing migrations in migration cache', () => {
            // Apply first migration
            const applied1 = migrationHelper.migrate(db, 1);
            expect(applied1).to.equal(1);

            // Create migration with number 2
            db.prepare(
                `INSERT INTO ${MIGRATION_CACHE.TABLE_NAME} (
                    ${MIGRATION_CACHE.COL_NUMBER},
                    ${MIGRATION_CACHE.COL_NAME},
                    ${MIGRATION_CACHE.COL_UP_SQL},
                    ${MIGRATION_CACHE.COL_DOWN_SQL}
                ) VALUES (2, 'fake', 'SELECT 1', 'select 1')`,
            ).run();

            // Apply other migrations, this should overwrite existing entries in the cache
            const applied2 = migrationHelper.migrate(db, 2);
            expect(applied2).to.equal(1);
            interface MigrationCacheRow {
                readonly [MIGRATION_CACHE.COL_NAME]: string;
                readonly [MIGRATION_CACHE.COL_UP_SQL]: string;
                readonly [MIGRATION_CACHE.COL_DOWN_SQL]: string;
            }
            const migration = db
                .prepare<[], MigrationCacheRow>(
                    `SELECT ${MIGRATION_CACHE.COL_NAME}, ${MIGRATION_CACHE.COL_UP_SQL}, ${MIGRATION_CACHE.COL_DOWN_SQL}
                    FROM ${MIGRATION_CACHE.TABLE_NAME}
                    WHERE number = 2`,
                )
                .get();
            expect(migration?.name).not.to.equal('fake');
            expect(migration?.upSql).not.to.equal('SELECT 1');
            expect(migration?.downSql).not.to.equal('SELECT 1');
        });

        it('removes migrations from cache after down-migration', () => {
            const appliedUp = migrationHelper.migrate(db, 2);
            expect(appliedUp).to.equal(2);
            expect(tableExists(db, MIGRATION_CACHE.TABLE_NAME)).to.be.true;
            expect(migrationCacheEntryCount(db)).to.equal(2);
            const appliedDown = migrationHelper.migrate(db, 1);
            expect(appliedDown).to.equal(1);
            expect(migrationCacheEntryCount(db)).to.equal(1);
        });

        it('can load migrations from cache when doing down-migration', () => {
            // First, run all migrations
            // @ts-expect-error: Unsafe usage of private property
            const maxMigrationAvailable: u53 = migrationHelper._maxEmbeddedMigrationNumber;
            const appliedUp = migrationHelper.migrate(db, maxMigrationAvailable);
            expect(appliedUp).to.equal(maxMigrationAvailable);
            expect(currentDbVersion(db)).to.equal(maxMigrationAvailable);

            // Next, fake an up-migration.
            const fakeUpSql = 'CREATE TABLE pepperonipizza(id INTEGER PRIMARY KEY)';
            const fakeDownSql = 'DROP TABLE pepperonipizza';
            db.prepare(fakeUpSql).run();
            db.prepare(
                `INSERT INTO ${MIGRATION_CACHE.TABLE_NAME} (
                    ${MIGRATION_CACHE.COL_NUMBER},
                    ${MIGRATION_CACHE.COL_NAME},
                    ${MIGRATION_CACHE.COL_UP_SQL},
                    ${MIGRATION_CACHE.COL_DOWN_SQL}
                ) VALUES (?, ?, ?, ?)`,
            ).run(maxMigrationAvailable + 1, 'faked', fakeUpSql, fakeDownSql);
            db.pragma(`user_version = ${maxMigrationAvailable + 1}`);
            expect(currentDbVersion(db)).to.equal(maxMigrationAvailable + 1);

            // Ensure that table exists
            expect(tableExists(db, 'pepperonipizza')).to.be.true;

            // Now let's recreate the migration helper. This simulates the state after a downgrade:
            // The latest migration was applied (and cached in the database), but does not exist in
            // the migration list of the current app.
            const migrationHelperAfterDowngrade = MigrationHelper.create(log, {
                userIdentity: ensureIdentityString('MEMEMEME'),
            });

            // Downgrade to latest bundled migration version!
            const migrationsApplied = migrationHelperAfterDowngrade.migrate(db);
            expect(migrationsApplied).to.equal(1); // 1 down migration should be applied
            expect(currentDbVersion(db), 'current db version').to.equal(maxMigrationAvailable);
        });
    });
}
