import { fieldsMap, primaryKeyMap } from "../mapStore";



type Constructor<T = any> = new (...args: any[]) => T;


export interface PrimaryKeyOptions {
  autoIncrement?: boolean;
}


export function PrimaryKey(options?: PrimaryKeyOptions): PropertyDecorator {
  return function FieldDecorator(instance: InstanceType<Constructor>, fieldName: string) {

    const autoIncrement = options?.autoIncrement ?? true;


    if (autoIncrement) {
      // Object.defineProperty(instance, fieldName, {
      //   configurable: true,
      //   writable: false,
      //   // set() {
      //   //   throw Error(`${fieldName} is a readonly`);
      //   // },
      //   // get(){
      //   //   return 
      //   // }
      // });
    }
    else {
      let list = fieldsMap.get(instance);
      if (list === undefined) {
        fieldsMap.set(instance, list = []);
      }

      list.push({
        index: true,
        fieldName: fieldName,
        unique: false,
        type: String
      });

    }


    primaryKeyMap.set(instance, {
      autoIncrement: autoIncrement,
      // @ts-ignore
      fieldName: fieldName
    });


  }
}





