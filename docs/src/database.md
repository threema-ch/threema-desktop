# Database

## Engine

We use SQLite encrypted with SQLCipher through the `better-sqlcipher` library.

## Schema Guidelines

**Add a `uid` field as primary key**

Since SQLite already has an internal ROWID (\[[1][rowidtable]\], \[[2][createtable-rowid]\]) on all
regular tables, we decided to always expose this field as `uid` by adding the column `uid INTEGER
PRIMARY KEY`.

**Foreign keys should point to the `uid`**

Foreign keys usually point to the `uid`. To quote [the docs][createtable-rowid], "access to records
via rowid is highly optimized and very fast".

[rowidtable]: https://www.sqlite.org/rowidtable.html
[createtable-rowid]: https://www.sqlite.org/lang_createtable.html#rowid

## Migrations

The database migrations are linear. Migrations are stored as SQL files in the `src/migrations/`
directory. For every migration, there is an up- and a down-migration.

To be able to migrate to an older version of the app, we need to down-migrate all schema changes
that happened since. The problem is that the older app does not yet know the down-migrations shipped
with the newer app. To mitigate this problem, we store the down-migration for every up-migration in
the database. When starting an older app version, the down-migrations are loaded from the database
(and then deleted).

Every migration is run inside a transaction, so you don't need to add `BEGIN` / `COMMIT` statements
to the migration file itself. If an error happens when applying a migration, it will be rolled back
in its entirety.

The current database version is tracked using the `user_version` PRAGMA.

### Adding Migrations

1. Add a pair of up- and down-migrations to `src/migrations/`.
2. Start the application, ensure that the up-migration can be applied and that the application still
   works properly.
3. Revert the source code changes (e.g. by stashing or checking out the develop branch) and ensure
   that the down-migration can be applied successfully and that the application still works
   properly.

### Migration Tips & Tricks

**Adding Unique Constraints**

SQLite does not allow adding constraints to an existing table. This means that newly added columns
added through `ALTER TABLE ... ADD COLUMN ..` cannot be marked as `UNIQUE`.

To achieve the same result however, you can add a unique index on that column:

```sql
CREATE UNIQUE INDEX ${TABLE}Unique${COLUMN} ON $TABLE($COLUMN);
```

Example (for the column `fileData` in the table `messagefileData`):

```sql
CREATE UNIQUE INDEX messageFileDataUniqueFileData ON messageFileData(fileData);
```
