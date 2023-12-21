import { Database } from "./database";
import { DynamicTable } from "./dynamicTable";
import { TableSchema } from "./schema";
export { DynamicTable, Database, TableSchema,
// PrimaryKey,
 };
// const database = new Database({
//   name:"channel",
//   version:1
// });
// const tbl = new TableSchema({
//   tableName:"ch2",
//   fields: {
//     k1: {
//       primaryKey:true,
//       index:false
//     },
//     name: {
//       index:false
//     }
//   }
// }, database);
// void async function main() {
//   globalThis.tbl = tbl;
//   tbl.onUpdateByValue("xxxxxxxx", (value) => {
//     console.log("k1::", value);
//   });
//   // tbl.save({
//   //   name:"xxx",
//   //   k1:"11"
//   // });
// }();
