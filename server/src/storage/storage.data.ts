import { Pool, PoolClient, Client, QueryResult } from 'pg';

export interface StorageData {
    pool: Pool;
    transaction: (worker: (client: PoolClient, commit: () => Promise<any>, rollback: () => Promise<any>) => Promise<any>) => Promise<any>;
}
