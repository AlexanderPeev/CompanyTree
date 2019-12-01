import {Handler} from "./handler";
import {RequestHandler} from "restify";
import {StorageData} from "../../storage/storage.data";
import { Pool, Client, QueryResult } from 'pg';

export class RootGetHandler implements Handler {
    constructor(private storage: StorageData) {
    }

    getRequestHandler(): RequestHandler {
        return (req, res, next) => {

            this.storage.transaction((client: Client, commit: () => Promise<any>, rollback: () => Promise<any>) => {
                return client.query("SELECT " +
                    " n1.node_id, n1.parent_node_id, n1.root_node_id, n1.height " +
                    " FROM nodes n1 WHERE node_id = root_node_id ").then((res1: QueryResult<any>) => {
                    if (res1.rows.length) {
                        commit();
                        res.json(res1.rows[0]);
                        next();
                        return Promise.resolve(null);
                    } else {
                        commit();
                        res.send(204);
                        next();
                        return Promise.resolve(null);
                    }
                }, err => {
                    rollback();
                    next(err);
                    return Promise.resolve(null);
                });
            });
        };
    }

}
