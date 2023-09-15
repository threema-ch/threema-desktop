// Forked from https://github.com/juanluispaz/ts-sql-query/blob/master/src/queryRunners/BetterSqlite3QueryRunner.ts
//
// The only changes are the name and the database driver type.
// We'll try to keep changes minimal, to make updating easier if the interface changes.

import {type Database} from 'better-sqlcipher';
import {type DatabaseType} from 'ts-sql-query/queryRunners/QueryRunner'
import {SqlTransactionQueryRunner} from 'ts-sql-query/queryRunners/SqlTransactionQueryRunner'
import {type PromiseProvider, type UnwrapPromiseTuple} from 'ts-sql-query/utils/PromiseProvider'

/* eslint-disable */

export interface BetterSqlCipherQueryRunnerConfig {
    promise?: PromiseProvider
}

export class BetterSqlCipherQueryRunner extends SqlTransactionQueryRunner {
    readonly database: DatabaseType
    readonly connection: Database
    readonly promise: PromiseProvider

    constructor(connection: Database, config?: BetterSqlCipherQueryRunnerConfig) {
        super()
        this.connection = connection
        this.database = 'sqlite'
        this.promise = config?.promise || Promise
    }

    useDatabase(database: DatabaseType): void {
        if (database !== 'sqlite') {
            throw new Error(`Unsupported database: ${database}. BetterSqlCipherQueryRunner only supports sqlite databases`)
        }
    }

    getNativeRunner(): Database {
        return this.connection
    }

    getCurrentNativeTransaction(): undefined {
        return undefined
    }

    execute<RESULT>(fn: (connection: unknown, transaction?: unknown) => Promise<RESULT>): Promise<RESULT> {
        return fn(this.connection)
    }

    protected executeQueryReturning(query: string, params: any[]): Promise<any[]> {
        try {
            const rows = this.connection.prepare(query).safeIntegers(true).all(params)
            return this.promise.resolve(rows)
        } catch (e) {
            return this.promise.reject(e)
        }
    }
    protected executeMutation(query: string, params: any[]): Promise<number> {
        try {
            return this.promise.resolve(this.connection.prepare(query).run(params).changes)
        } catch (e) {
            return this.promise.reject(e)
        }
    }
    override executeInsertReturningLastInsertedId(query: string, params: any[] = []): Promise<any> {
        if (this.containsInsertReturningClause(query, params)) {
            return super.executeInsertReturningLastInsertedId(query, params)
        }

        try {
            return this.promise.resolve(this.connection.prepare(query).safeIntegers(true).run(params).lastInsertRowid)
        } catch (e) {
            return this.promise.reject(e)
        }
    }
    addParam(params: any[], value: any): string {
        params.push(value)
        return '?'
    }
    createResolvedPromise<RESULT>(result: RESULT): Promise<RESULT> {
        return this.promise.resolve(result)
    }
    protected createAllPromise<P extends Promise<any>[]>(promises: [...P]): Promise<UnwrapPromiseTuple<P>> {
        return this.promise.all(promises) as any
    }
}
