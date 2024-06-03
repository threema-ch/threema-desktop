import * as path from 'node:path';
import * as process from 'node:process';

import * as v from '@badrap/valita';
import type {Database} from 'better-sqlcipher';

import {MigrationError} from '~/common/error';
import type {Logger} from '~/common/logging';
import type {IdentityString} from '~/common/network/types';
import {ensureU53, ensureU64, type u53, u64ToU53} from '~/common/types';
import {assert, unreachable, unwrap} from '~/common/utils/assert';

/**
 * Inject additional information which is not stored in the database for the migrations.
 */
export interface DbMigrationSupplements {
    readonly userIdentity: IdentityString;
}

// Dynamically import all migration files.
// This is done using the glob import feature in vite:
// https://vitejs.dev/guide/features.html#glob-import
const migrationFiles = import.meta.glob<string>('/migrations/*.sql', {
    eager: true,
    as: 'raw',
});

// Database migration cache table and column name constants.
//
// We're not using ts-sql-query or some other abstraction in order to keep everything related to the
// database as simple as possible. The migration cache is a core part of the migration system, and
// it should be easy to see everything that's happening.
//
// IMPORTANT: Do not rename values below, otherwise a migration of the cache table is required.
const MIGRATION_CACHE = {
    TABLE_NAME: '_threema_migration_cache',
    COL_NUMBER: 'number',
    COL_NAME: 'name',
    COL_UP_SQL: 'upSql',
    COL_DOWN_SQL: 'downSql',
    COL_APPLIED_AT: 'appliedAt',
} as const;

/**
 * Validation schema for database cache table row.
 */
export const MIGRATION_CACHE_ROW_SCHEMA = v.object({
    [MIGRATION_CACHE.COL_NUMBER]: v.union(
        v.bigint().map(ensureU64).map(u64ToU53),
        v.number().map(ensureU53),
    ),
    [MIGRATION_CACHE.COL_NAME]: v.string(),
    [MIGRATION_CACHE.COL_UP_SQL]: v.string(),
    [MIGRATION_CACHE.COL_DOWN_SQL]: v.string(),
});

/**
 * A migration file.
 */
class MigrationFile {
    public constructor(
        public readonly number: u53,
        public readonly name: string,
        public readonly direction: 'up' | 'down',
        public readonly contents: string,
    ) {}

    // eslint-disable-next-line no-restricted-syntax
    public static fromFile(
        [filepath, contents]: [string, string],
        supplementaryInformation: DbMigrationSupplements,
    ): MigrationFile | undefined {
        const filename = path.basename(filepath);
        const match = filename.match(/^(?<number>\d+)-(?<name>.*)\.(?<direction>up|down)\.sql$/u);
        if (match === null) {
            return undefined;
        }
        const groups = unwrap(match.groups);
        return new MigrationFile(
            parseInt(unwrap(groups.number), 10),
            unwrap(groups.name),
            unwrap(groups.direction) as 'up' | 'down',
            preprocessSqlQuery(contents, supplementaryInformation),
        );
    }

    public toString(): string {
        return `[MigrationFile ${this.number}: ${this.name} (${this.direction})]`;
    }
}

type MigrationSource = 'embedded' | 'db';

/**
 * A migration pair consisting of both an up- and a down-migration.
 */
class Migration {
    public readonly number: u53;

    public constructor(
        public readonly up: MigrationFile,
        public readonly down: MigrationFile,
        public readonly source: MigrationSource,
    ) {
        assert(up.number === down.number, 'Up and down migration must have the same number');
        this.number = up.number;
    }

    /**
     * Run up-migration, write the processed query into the migration cache.
     */
    public migrateUp(db: Database, log: Logger): void {
        this._migrate(db, log, this.up, (transactionDb) => {
            // After applying up-migration, cache it in the database
            const result = transactionDb
                .prepare(
                    `INSERT OR REPLACE INTO ${MIGRATION_CACHE.TABLE_NAME} (
                            ${MIGRATION_CACHE.COL_NUMBER},
                            ${MIGRATION_CACHE.COL_NAME},
                            ${MIGRATION_CACHE.COL_UP_SQL},
                            ${MIGRATION_CACHE.COL_DOWN_SQL}
                        ) VALUES (?, ?, ?, ?);`,
                )
                .run(this.number, this.up.name, this.up.contents, this.down.contents);
            if (result.changes !== 1) {
                throw new Error(
                    `Expected migration cache insertion to affect 1 row, but affected ${result.changes}`,
                );
            }
        });
    }

    /**
     * Run down-migration. Remove the query from the migration cache.
     */
    public migrateDown(db: Database, log: Logger): void {
        this._migrate(db, log, this.down, (transactionDb) => {
            // After applying down-migration, remove cache entry from database
            transactionDb
                .prepare(
                    `DELETE FROM ${MIGRATION_CACHE.TABLE_NAME}
                         WHERE ${MIGRATION_CACHE.COL_NUMBER} = ?`,
                )
                .run(this.number);
        });
    }

    /**
     * Run the specified migration.
     *
     * @param db The active database
     * @param log A logger instance
     * @param file The migration file to process
     * @param postExec A function that – if provided – will be run after the migration SQL, inside
     *   the same transaction
     */
    private _migrate(
        db: Database,
        log: Logger,
        file: MigrationFile,
        postExec?: (transactionDb: Database) => void,
    ): void {
        // Execute SQL in database in a transaction
        log.debug(`Running ${file.direction}-migration ${file.number} (${file.name})…`);
        const before = process.hrtime.bigint();
        db.transaction((sql: string) => {
            // Run migration
            db.exec(sql);
            // Post exec
            postExec?.(db);
            // Update version
            db.pragma(`user_version = ${file.direction === 'up' ? file.number : file.number - 1}`);
        })(file.contents);
        const after = process.hrtime.bigint();
        const durationMs = (after - before) / 1000000n;
        log.info(
            `✅ Processed ${file.direction}-migration ${file.number} (${file.name}) in ${durationMs} ms!`,
        );
    }
}

/**
 * A migration pair consisting of both an up- and a down-migration.
 */
class MigrationBuilder {
    private readonly _number;
    private _up?: MigrationFile;
    private _down?: MigrationFile;

    public constructor(
        initialFile: MigrationFile,
        private readonly _source: MigrationSource,
    ) {
        this._number = initialFile.number;
        if (initialFile.direction === 'up') {
            this._up = initialFile;
        } else {
            this._down = initialFile;
        }
    }

    /**
     * Add an additional file to this builder.
     *
     * @throws {MigrationError} If the migration number does not match this builder.
     * @throws {MigrationError} If a migration file for this direction was already added.
     */
    public add(additionalFile: MigrationFile): void {
        // Ensure the numbers match
        if (additionalFile.number !== this._number) {
            throw new MigrationError(
                `Migration number mismatch: Cannot add ${additionalFile} to builder for migration ${this._number}`,
            );
        }

        // Store file
        switch (additionalFile.direction) {
            case 'up':
                if (this._up !== undefined) {
                    throw new MigrationError(
                        `Up migration already defined for migration ${additionalFile.number}`,
                    );
                } else {
                    this._up = additionalFile;
                }
                break;
            case 'down':
                if (this._down !== undefined) {
                    throw new MigrationError(
                        `Down migration already defined for migration ${additionalFile.number}`,
                    );
                } else {
                    this._down = additionalFile;
                }
                break;
            default:
                unreachable(additionalFile.direction);
        }
    }

    /**
     * Combines the migration files into a migration.
     *
     * @throws {MigrationError} if one of the two directions is missing.
     */
    public finish(): Migration {
        if (this._up !== undefined && this._down !== undefined) {
            return new Migration(this._up, this._down, this._source);
        }
        throw new MigrationError(`Incomplete migration ${this._number}, up or down step missing`);
    }
}

/**
 * Load migrations and apply them to a database.
 *
 * All files ending in `.sql` will be loaded. For every migration number, an up- and a
 * down-migration must exist. Example:
 *
 *     src/migrations/0001-initial.up.sql
 *     src/migrations/0001-initial.down.sql
 *     src/migrations/0002-update-contacts-add-nickname.up.sql
 *     src/migrations/0002-update-contacts-add-nickname.down.sql
 *     ...
 *
 * Every migration is run inside a transaction, so you don't need to add BEGIN / COMMIT statements
 * to the migration file itself. If an error happens when applying a migration, it will be rolled
 * back in its entirety.
 */
export class MigrationHelper {
    private constructor(
        private readonly _log: Logger,
        private readonly _migrations: Map<u53, Migration>,
        private readonly _maxEmbeddedMigrationNumber: u53,
    ) {}

    /**
     * Instantiate helper and load embedded migrations.
     *
     * @throws {MigrationError} if something went wrong during loading of the migrations.
     */
    public static create(
        log: Logger,
        supplementaryInformation: DbMigrationSupplements,
    ): MigrationHelper {
        // Filter and parse valid embedded migration files
        const builders = new Map<u53, MigrationBuilder>();
        let maxMigrationNumber = 0;
        for (const file of Object.entries(migrationFiles).map((migrationFile) =>
            MigrationFile.fromFile(migrationFile, supplementaryInformation),
        )) {
            if (file === undefined) {
                continue;
            }
            const builder = builders.get(file.number);
            if (builder !== undefined) {
                builder.add(file);
            } else {
                builders.set(file.number, new MigrationBuilder(file, 'embedded'));
            }
            maxMigrationNumber = Math.max(maxMigrationNumber, file.number);
        }

        // Combine migration pairs
        const migrations = new Map<u53, Migration>();
        for (const [index, builder] of builders) {
            const migration = builder.finish();
            migrations.set(index, migration);
        }
        log.info(`Loaded ${migrations.size} db migrations`);

        return new MigrationHelper(log, migrations, maxMigrationNumber);
    }

    /**
     * Process all migrations that haven't already been applied.
     *
     * By default, the target version is the highest migration number found.
     * But if you want to migrate to a specific version, you can specify the optional `toVersion`
     * argument.
     *
     * @returns the number of migrations applied.
     * @throws {MigrationError} if applying the migrations fails.
     */
    public migrate(db: Database, toVersion?: u53): u53 {
        const fromVersion = Number(db.pragma('user_version', {simple: true}));
        if (toVersion === undefined) {
            toVersion = this._maxEmbeddedMigrationNumber;
        }

        // If there's nothing to do, return immediately
        if (fromVersion === toVersion) {
            this._log.info(`Database version is already ${toVersion}, nothing to do`);
            return 0;
        }
        this._log.info(`Running migrations: ${fromVersion} → ${toVersion}`);

        // Ensure that the migration cache table exists
        this._setupMigrationCacheTable(db);

        // Migrate up or down
        if (fromVersion < toVersion) {
            return this._migrateUp(db, fromVersion, toVersion);
        }
        return this._migrateDown(db, fromVersion, toVersion);
    }

    /**
     * Ensure that the migration cache table exists.
     *
     * @param db The database reference
     * @throws if table creation fails
     */
    private _setupMigrationCacheTable(db: Database): void {
        const createStatement = db.prepare(`
            CREATE TABLE IF NOT EXISTS ${MIGRATION_CACHE.TABLE_NAME} (
                ${MIGRATION_CACHE.COL_NUMBER} INTEGER UNIQUE NOT NULL,
                ${MIGRATION_CACHE.COL_NAME} STRING NOT NULL,
                ${MIGRATION_CACHE.COL_UP_SQL} TEXT NOT NULL,
                ${MIGRATION_CACHE.COL_DOWN_SQL} TEXT NOT NULL,
                ${MIGRATION_CACHE.COL_APPLIED_AT} INTEGER NOT NULL DEFAULT(unixepoch() * 1000)
            );
        `);
        createStatement.run();
    }

    /**
     * Load cached migrations.
     *
     * @param db The database reference
     */
    private _loadCachedMigrations(db: Database): void {
        const selectStatement = db.prepare(`
            SELECT
                ${MIGRATION_CACHE.COL_NUMBER},
                ${MIGRATION_CACHE.COL_NAME},
                ${MIGRATION_CACHE.COL_UP_SQL},
                ${MIGRATION_CACHE.COL_DOWN_SQL}
            FROM ${MIGRATION_CACHE.TABLE_NAME}
            WHERE ${MIGRATION_CACHE.COL_NUMBER} > ?
            ORDER BY ${MIGRATION_CACHE.COL_NUMBER} ASC
        `);
        const results = selectStatement.all(this._maxEmbeddedMigrationNumber);
        for (const row of results) {
            const validRow = MIGRATION_CACHE_ROW_SCHEMA.parse(row);
            const migration = new Migration(
                new MigrationFile(validRow.number, validRow.name, 'up', validRow.upSql),
                new MigrationFile(validRow.number, validRow.name, 'down', validRow.downSql),
                'db',
            );
            this._migrations.set(validRow.number, migration);
        }
    }

    /**
     * Migrate upwards.
     */
    private _migrateUp(db: Database, fromVersion: u53, toVersion: u53): u53 {
        let count = 0;
        for (let version = fromVersion + 1; version <= toVersion; version++) {
            const migration = this._migrations.get(version);
            if (migration === undefined) {
                throw new MigrationError(`Could not find migration for version ${version}`);
            }

            try {
                migration.migrateUp(db, this._log);
            } catch (error) {
                throw new MigrationError(`Running the up-migration ${version} failed`, {
                    from: error,
                });
            }
            count++;
        }
        return count;
    }

    /**
     * Migrate downwards.
     */
    private _migrateDown(db: Database, fromVersion: u53, toVersion: u53): u53 {
        // When migrating down, it's likely that some of the migrations are not embedded, but need
        // to be loaded from the database cache.
        this._loadCachedMigrations(db);

        let count = 0;
        for (let version = fromVersion; version > toVersion; version--) {
            const migration = this._migrations.get(version);
            if (migration === undefined) {
                throw new MigrationError(`Could not find migration for version ${version}`);
            }

            try {
                migration.migrateDown(db, this._log);
            } catch (error) {
                throw new MigrationError(`Running the down-migration ${version} failed`, {
                    from: error,
                });
            }
            count++;
        }

        return count;
    }
}

/**
 * Preprocess a raw SQL query by replacing placeholders with information not available in the
 * schema.
 */
function preprocessSqlQuery(
    rawQuery: string,
    supplementaryInformation: DbMigrationSupplements,
): string {
    return rawQuery.replaceAll('{identity}', supplementaryInformation.userIdentity);
}
