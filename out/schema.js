import { TableAction } from "./tableAction";
export class TableSchema extends TableAction {
    constructor(schema, database) {
        super(schema.tableName, schema.fields, database);
        this.initialize();
    }
}
