import {Handler} from "./handler";
import {RequestHandler} from "restify";
import {StorageData} from "../../storage/storage.data";
import {ChangesResult} from "./changes.result";
import {ClearAncestors} from "./clear.ancestors";
import {GetAncestors} from "./get.ancestors";
import { Pool, Client, QueryResult } from 'pg';
import {Validator} from "../validator";

export class CompanyByIdPatchHandler implements Handler {
    constructor(private storage: StorageData) {
    }

    getRequestHandler(): RequestHandler {
        return (req, res, next) => {
            const id = parseInt(req.params.id);
            const newData = req.body;
            const newParentId = newData.parent_node_id;

            this.storage.transaction((client: Client, commit: () => Promise<any>, rollback: () => Promise<any>) => {
                return client.query({values: [id], text: "SELECT " +
                    " n1.node_id, n1.parent_node_id, n1.root_node_id, n1.height " +
                    " FROM nodes n1 WHERE node_id = $1 "}).then((res1: QueryResult<any>) => {
                    if (res1.rows.length) {
                        const currentData = res1.rows[0];
                        const oldParentId = currentData.parent_node_id;

                        if(!oldParentId || oldParentId === newParentId || id === newParentId) {
                            // root cannot be moved
                            // new parent must be different from old parent
                            // new parent must be different from self
                            commit();
                            res.send(400);
                            next();
                            return Promise.resolve(null);
                        } else {
                            return new GetAncestors(client).getAncestors([newParentId]).then((ancestors: any[]) => {
                                if(ancestors.indexOf(id) !== -1) {
                                    // Naughty! Trying to make tree into a graph
                                    commit();
                                    res.send(400);
                                    next();
                                    return Promise.resolve(null);
                                } else {
                                    return client.query({values: [newParentId], text: "SELECT " +
                                        " n1.node_id, n1.parent_node_id, n1.root_node_id, n1.height " +
                                        " FROM nodes n1 WHERE node_id = $1 "}).then((resNew: QueryResult<any>) => {
                                        if (resNew.rows.length) {
                                            const newParentData = resNew.rows[0];
                                            const newParentHeight = newParentData.height;

                                            return new ClearAncestors(client).clearAncestors([oldParentId, newParentId]).then((res2: QueryResult<any>) => {
                                                 return client.query({values: [id, newParentId, newParentHeight + 1], text: "UPDATE nodes SET parent_node_id = $2, height = $3 WHERE node_id = $1 "}).then((res3: QueryResult<any>) => {
                                                    commit();
                                                    res.send(204);
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
                                        } else {
                                            // New parent does not exist
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
                                }
                            });
                        }
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
