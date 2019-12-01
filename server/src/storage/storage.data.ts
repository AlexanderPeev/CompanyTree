const { Pool, PoolClient, Client, Result } = require('pg')

export interface StorageData {
    pool: Pool;
    transaction: (worker: (client: PoolClient, commit: () => Promise<any>, rollback: () => Promise<any>) => Promise<any>) => Promise<any>;
}
