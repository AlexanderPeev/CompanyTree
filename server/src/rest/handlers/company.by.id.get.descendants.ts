import {Handler} from "./handler";
import {GetDescendants} from "./descendants";
import {RequestHandler} from "restify";
import {StorageData} from "../../storage/storage.data";
import { Pool, PoolClient, Client, QueryResult } from 'pg';

export class CompanyByIdGetDescendantsHandler implements Handler {
    constructor(private storage: StorageData) {
    }

    getRequestHandler(): RequestHandler {
        return (req, res, next) => {
            const id = parseInt(req.params.id, 10);

            this.storage.transaction((client: PoolClient, commit: () => Promise<any>, rollback: () => Promise<any>) => {
                return client.query({values: [id], text: 'SELECT d.descendants::json FROM descendants d WHERE node_id=$1'}).then((res1: QueryResult<any>) => {
                    if (res1.rows.length) {
                        const descendants = res1.rows[0].descendants;
                        commit();
                        res.json(descendants.list);
                        next();
                        return Promise.resolve(null);
                    } else {
                        return new GetDescendants(client).getDescendants(id).then((descendants: any) => {
                            client.query({values: [id, {list: descendants}], text: 'INSERT INTO descendants (node_id, descendants) VALUES($1, $2)'}).then((res2: QueryResult<any>) => {
                                commit();
                                res.json(descendants);
                                next();
                                return Promise.resolve(null);
                            }, err => {
                                rollback();
                                next(err);
                                return Promise.resolve(null);
                            });
                        }, err => {
                            rollback();
                            next(err);
                            return Promise.resolve(null);
                        });
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
