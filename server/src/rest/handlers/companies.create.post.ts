import {Handler} from "./handler";
import {RequestHandler} from "restify";
import {StorageData} from "../../storage/storage.data";
import {ChangesResult} from "./changes.result";
import {ClearAncestors} from "./clear.ancestors";
import {Validator} from "../validator";
import { Pool, Client, QueryResult } from 'pg';

export class CompaniesCreatePostHandler implements Handler {
    constructor(private storage: StorageData) {
    }

    getRequestHandler(): RequestHandler {
        return (req, res, next) => {
            const newData = req.body;

            this.storage.transaction((client: Client, commit: () => Promise<any>, rollback: () => Promise<any>) => {
                return client.query({values: [newData.parent_node_id], text: "SELECT " +
                    " n1.node_id, n1.parent_node_id, n1.root_node_id, n1.height " +
                    " FROM nodes n1 WHERE node_id = $1 "}).then((res1: QueryResult<any>) => {
                    if (res1.rows.length) {
                        const parentNode = res1.rows[0];
                        newData.parent_node_id = parentNode.node_id;
                        newData.root_node_id = parentNode.root_node_id;
                        newData.height = parentNode.height + 1;
                        return new ClearAncestors(client).clearAncestors([parentNode.node_id]).then((res2: QueryResult<any>) => {
                            return client.query({values: [newData.parent_node_id, newData.root_node_id, newData.height], text: 'INSERT INTO nodes (parent_node_id, root_node_id, height) VALUES($1, $2, $3) RETURNING node_id'}).then((res3: QueryResult<any>) => {
                                return client.query({values: [res3.rows[0].node_id], text: "SELECT " +
                                    " n1.node_id, n1.parent_node_id, n1.root_node_id, n1.height " +
                                    " FROM nodes n1 WHERE node_id = $1 "}).then((res4: QueryResult<any>) => {
                                    if (res4.rows.length) {
                                        commit();
                                        res.json(res4.rows[0]);
                                        next();
                                        return Promise.resolve(null);
                                    } else {
                                        commit();
                                        res.send(204);
                                        next();
                                        return Promise.resolve(null);
                                    }
                                 }, (err: any) => {
                                     rollback();
                                     next(err);
                                     return Promise.resolve(null);
                                 });
                            }, (err: any) => {
                                rollback();
                                next(err);
                                return Promise.resolve(null);
                            });
                        }, (err: any) => {
                            rollback();
                            next(err);
                            return Promise.resolve(null);
                        });
                    } else {
                        rollback();
                        res.send(400);
                        next();
                        return Promise.resolve(null);
                    }
                 });
            });
        };
    }

}
