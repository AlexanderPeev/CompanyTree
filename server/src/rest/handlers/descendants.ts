import {StorageData} from "../../storage/storage.data";
import { Pool, Client, QueryResult } from 'pg';

export class GetDescendants {
    constructor(private client: Client) {}

    public getDescendants(id: number): Promise<any[]> {
        return this.client.query({values: [id], text: "WITH RECURSIVE descendants AS (" +
            " SELECT " +
            " n1.node_id, n1.parent_node_id, n1.root_node_id, n1.height " +
            " FROM nodes n1 WHERE node_id = $1 " +
            " UNION " +
            " SELECT " +
            " n2.node_id, n2.parent_node_id, n2.root_node_id, n2.height " +
            " FROM nodes n2 " +
            " INNER JOIN descendants d ON d.node_id = n2.parent_node_id " +
         ") SELECT * FROM descendants"}).then((res: QueryResult<any>) => {
            const tree: any = {};
            const descendants: any[] = [];

            res.rows.forEach((row: any) => {
                const key: string = row.node_id + '';
                const parentKey: string = row.parent_node_id ? row.parent_node_id + '' : '';
                const childrenField: string = 'children';
                row[childrenField] = [];
                tree[key] = row;
                if (row.parent_node_id) {
                    // add descendant indirectly
                    tree[parentKey][childrenField].push(row);
                }
                if (row.parent_node_id === id) {
                    // add child to descendants
                    descendants.push(row);
                }
            });

            return descendants;
         });
    }
}