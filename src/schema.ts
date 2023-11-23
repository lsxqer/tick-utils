import { Database } from "./database";
import { TableAction, TableFields } from "./tableAction";



export interface Schema {
  tableName: string;
  fields: TableFields;
}

export class TableSchema<T extends Schema = Schema> extends TableAction<T["fields"]> {

  constructor(
    schema: T,
    database: Database
  ) {
    super(schema.tableName, schema.fields, database);
    this.initialize();
  }


}

