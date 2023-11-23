import { FieldMapValue, fieldsMap, primaryKeyMap } from "../mapStore";






export interface IModelOptions {
  tableName?: string;
}



export function Model(options?: IModelOptions): ClassDecorator {


  return function ModelDecorator(target: any): void {

    const fields = fieldsMap.get(target.prototype);

    const fieldMap = new Map<string, FieldMapValue>();
    const primaryKey = primaryKeyMap.get(target.prototype);


    fields.forEach((el: FieldMapValue) => {
      fieldMap.set(el.fieldName, el);
    });

    Object.defineProperty(target.prototype, "tableName", {
      configurable: true,
      enumerable: false,
      get() {
        return options?.tableName ?? target.name;
      },
    });

    Object.defineProperty(target.prototype, "primaryKey", {
      configurable: true,
      enumerable: false,
      get() {
        return primaryKey;
      },
    });

    Object.defineProperty(target.prototype, "fields", {
      configurable: true,
      enumerable: false,
      get() {
        return fieldMap
      },
    });


  }
}

