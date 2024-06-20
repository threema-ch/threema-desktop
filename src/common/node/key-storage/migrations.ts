import type {
    DecryptedKeyStorage,
    EncryptedKeyStorage,
} from '~/common/internal-protobuf/key-storage-file';
import type {Logger} from '~/common/logging';
import {assert, unwrap} from '~/common/utils/assert';
import {byteToHex} from '~/common/utils/byte';

type KeyStorageSchema = EncryptedKeyStorage | DecryptedKeyStorage;

/**
 * Generic type of a migration function.
 *
 * The schema will be modified directly. If something goes wrong, an exception must be thrown.
 */
type Migration<TSchema extends KeyStorageSchema> = (schema: Omit<TSchema, 'schemaVersion'>) => void;

/**
 * Encrypted key store migrations.
 *
 * When adding migrations, make sure to also update the schema and schema version in
 * {@link ENCRYPTED_KEY_STORAGE_FILE_CONTENTS_SCHEMA}.
 */
const ENCRYPTED_KEY_STORAGE_MIGRATIONS: Migration<EncryptedKeyStorage>[] = [
    // 0 -> 1
    (schema: Omit<EncryptedKeyStorage, 'schemaVersion'>) => {
        // This initial migration is only here to introduce the migration system, so no changes
        // will be made to the contents.
    },
];

/**
 * Decrypted key store migrations.
 *
 * When adding migrations, make sure to also update the schema and schema version in
 * {@link KEY_STORAGE_CONTENTS_SCHEMA}.
 */
const DECRYPTED_KEY_STORAGE_MIGRATIONS: Migration<DecryptedKeyStorage>[] = [
    // 0 -> 1
    (schema: Omit<DecryptedKeyStorage, 'schemaVersion'>) => {
        // This initial migration is only here to introduce the migration system, so no changes
        // will be made to the contents.
    },
    // 1 -> 2: Numeric server group was changed to string-based server group
    (schema: Omit<DecryptedKeyStorage, 'schemaVersion'>) => {
        assert(schema.identityData !== undefined, 'Decrypted key storage is missing identity data');
        const serverGroupHex = byteToHex(schema.identityData.deprecatedServerGroup);
        schema.identityData.serverGroup = serverGroupHex;
    },
];

export const ENCRYPTED_KEY_STORAGE_SCHEMA_VERSION = ENCRYPTED_KEY_STORAGE_MIGRATIONS.length;
export const DECRYPTED_KEY_STORAGE_SCHEMA_VERSION = DECRYPTED_KEY_STORAGE_MIGRATIONS.length;

/**
 * Helper to migrate the key storage format to the current version.
 *
 * Note: Currently only up-migrations are supported, but not down-migrations.
 */
export class MigrationHelper {
    public constructor(
        private readonly _log: Logger,
        private readonly _encryptedKeyStorageMigrations: Migration<EncryptedKeyStorage>[] = ENCRYPTED_KEY_STORAGE_MIGRATIONS,
        private readonly _decryptedKeyStorageMigrations: Migration<DecryptedKeyStorage>[] = DECRYPTED_KEY_STORAGE_MIGRATIONS,
    ) {
        _log.debug(
            `Loaded ${_encryptedKeyStorageMigrations.length} encrypted + ${_decryptedKeyStorageMigrations.length} decrypted key storage migrations`,
        );
    }

    /**
     * Migrate the encrypted key storage schema in-place.
     *
     * @returns whether or not the schema was modified.
     */
    public migrateEncryptedKeyStorage(encryptedKeyStorage: EncryptedKeyStorage): boolean {
        return this._migrate(encryptedKeyStorage, 'encrypted', this._encryptedKeyStorageMigrations);
    }

    /**
     * Migrate the decrypted key storage schema in-place.
     *
     * @returns whether or not the schema was modified.
     */
    public migrateDecryptedKeyStorage(decryptedKeyStorage: DecryptedKeyStorage): boolean {
        return this._migrate(decryptedKeyStorage, 'decrypted', this._decryptedKeyStorageMigrations);
    }

    /**
     * Migrate the specified key storage schema in-place.
     *
     * @returns whether or not the schema was modified.
     */
    private _migrate<TSchema extends KeyStorageSchema>(
        schema: TSchema,
        schemaType: 'encrypted' | 'decrypted',
        migrations: Migration<TSchema>[],
    ): boolean {
        const originalVersion = schema.schemaVersion;
        const targetVersion = migrations.length;
        while (schema.schemaVersion < targetVersion) {
            // Find appropriate migration
            const upMigration = unwrap(migrations[schema.schemaVersion]);

            // Migrate up, increment version
            upMigration(schema);
            schema.schemaVersion += 1;

            this._log.debug(
                `Processed ${schemaType} key storage up-migration ${schema.schemaVersion}`,
            );
        }
        if (schema.schemaVersion > originalVersion) {
            this._log.info(
                `Migrated ${schemaType} key storage format from version ${originalVersion} to version ${schema.schemaVersion}`,
            );
            return true;
        }
        return false;
    }
}
