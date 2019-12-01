import {StorageData} from "./storage.data";
import { Pool, PoolClient, Client, QueryResult } from 'pg';

interface ConnectionAndDatabase {
    pool: Pool;
}

export class StorageEngine {
    private pool: Pool | null = null;

    constructor(private readonly dbEndpoint: string) {}

    public prepare(): Promise<StorageData> {
        return this.connect().then(pool => this.createTablesIfMissing(pool)).then(data => this.createRootIfMissing(data));
    }

    private connect(): Promise<Pool> {
        const pool = new Pool({
          connectionString: this.dbEndpoint,
        });
        return Promise.resolve(pool);
    }

    private createTablesIfMissing(pool: Pool): Promise<StorageData> {
        const transaction: (worker: (client: PoolClient, commit: () => Promise<any>, rollback: () => Promise<any>) => Promise<any>) => Promise<any> = (worker: (client: PoolClient, commit: () => Promise<any>, rollback: () => Promise<any>) => Promise<any>) => {
            return pool.connect().then((client: PoolClient) => {
                const commit: () => Promise<any> = () => {
                    return client.query('COMMIT').then((committed: any) => {
                        client.release();
                    });
                };
                const rollback: () => Promise<any> = () => {
                    return client.query('ROLLBACK').then((rolledBack: any) => {
                        client.release();
                    });
                };
                return client.query('BEGIN').then((begun: any) => {
                    return worker(client, commit, rollback).catch((err: any) => {
                        return rollback().then(v => Promise.reject(err));
                    });
                });
            });
        };
        const storage = {pool, transaction};

        return pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'").then((value: QueryResult<any>) => {
            const tables: any = {};
            value.rows.forEach((row: any) => {
                tables[row.tablename] = true;
            });
            console.log(tables);
            if (!tables.nodes) {
                return pool.query("CREATE TABLE nodes (node_id serial PRIMARY KEY, parent_node_id integer NULL, root_node_id integer NOT NULL, height integer NOT NULL, " +
                 "CONSTRAINT nodes_parent_id_fkey FOREIGN KEY (parent_node_id) REFERENCES nodes (node_id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION, " +
                 "CONSTRAINT nodes_root_id_fkey FOREIGN KEY (root_node_id) REFERENCES nodes (node_id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION" +
                 ")").then((value: QueryResult<any>) => {
                    if (!tables.descendants) {
                        return this.createDescendantsTable(storage);
                    } else {
                        return storage;
                    }
                 })
            } else if (!tables.descendants) {
                return this.createDescendantsTable(storage);
            } else {
                return storage;
            }
        });
    }

    private createDescendantsTable(storage: StorageData): Promise<StorageData> {
       return storage.pool.query("CREATE TABLE descendants (node_id integer PRIMARY KEY, descendants json NOT NULL, " +
        "CONSTRAINT descendants_node_id_fkey FOREIGN KEY (node_id) REFERENCES nodes (node_id) MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION" +
        ")").then((value: QueryResult<any>) => {
            return storage;
        })
    }

    private createRootIfMissing(storage: StorageData): Promise<StorageData> {
        return storage.pool.query("SELECT count(*) as total FROM nodes").then((value: QueryResult<any>) => {
            let total: number = 0;
            value.rows.forEach((row: any) => {
                total += +row.total;
            });
            console.log('Total: ', total);
            if (!total) {
                return storage.transaction((client: PoolClient, commit: () => Promise<any>, rollback: () => Promise<any>) => {
                    return client.query("INSERT INTO nodes (parent_node_id, root_node_id, height) VALUES(NULL, lastval(), 0)").then((value2: QueryResult<any>) => {
                        commit();
                        return storage;
                    }, (err: any) => {
                        rollback();
                        return Promise.reject(err);
                    });
                });
            } else {
               return storage;
            }
        });
    }
}
