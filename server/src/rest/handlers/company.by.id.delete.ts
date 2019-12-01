import {Handler} from "./handler";
import {RequestHandler} from "restify";
import {StorageData} from "../../storage/storage.data";
import {ClearAncestors} from "./clear.ancestors";
import { Pool, PoolClient, Client, QueryResult } from 'pg';

export class CompanyByIdDeleteHandler implements Handler {
    constructor(private storage: StorageData) {
    }

    getRequestHandler(): RequestHandler {
        return (req, res, next) => {

            this.storage.transaction((client: PoolClient, commit: () => Promise<any>, rollback: () => Promise<any>) => {
                return new ClearAncestors(client).clearAncestors([req.params.id]).then((res1: QueryResult<any>) => {
                    return client.query({values: [req.params.id], text: 'DELETE FROM nodes WHERE node_id = $1 AND node_id != root_node_id'}).then((res2: QueryResult<any>) => {
                         console.log(res2);
                         if(res2.rowCount) {
                             commit();
                             res.send(204);
                             next();
                             return Promise.resolve(null);
                         } else {
                             // does not exist or root
                             commit();
                             res.send(400);
                             next();
                             return Promise.resolve(null);
                         }
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
            });
        };
    }

}
