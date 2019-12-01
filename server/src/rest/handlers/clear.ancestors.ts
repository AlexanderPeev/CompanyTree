import {StorageData} from "../../storage/storage.data";
import { Pool, PoolClient, Client, QueryResult } from 'pg';

export class ClearAncestors {
    constructor(private client: PoolClient) {}

    public clearAncestors(ids: number[]): Promise<any> {
        let idParams = "";
        let nextId = 1;
        ids.forEach(id => {
            if(idParams.length) {
                idParams += ', ';
            }
            idParams += '$' + nextId;
            ++nextId;
        });
        return this.client.query({values: ids, text: "WITH RECURSIVE ancestors AS (" +
                   " SELECT " +
                   " n1.node_id, n1.parent_node_id, n1.root_node_id, n1.height " +
                   " FROM nodes n1 WHERE node_id IN (" + idParams + ") " +
                   " UNION " +
                   " SELECT " +
                   " n2.node_id, n2.parent_node_id, n2.root_node_id, n2.height " +
                   " FROM nodes n2 " +
                   " INNER JOIN ancestors a ON a.parent_node_id = n2.node_id " +
                ") DELETE FROM descendants WHERE node_id IN (SELECT node_id FROM ancestors)"});
    }
}