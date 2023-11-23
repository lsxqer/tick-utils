import { fieldsMap } from "../mapStore";



type Constructor<T = any> = new (...args: any[]) => T;



export interface FieldOptions {
  index?: boolean | string;
  unique?: boolean;
}
export function Field(options?: FieldOptions) :PropertyDecorator{
  return function FieldDecorator(instance: InstanceType<Constructor>, fieldName: string) {
  //  console.log("field");
  //  const typeConstructor = Reflect.getMetadata("design:type", instance, fieldName);
  //  // const setter = descriptor.set;
  //  let _value = instance[fieldName];

  //  Object.defineProperty(instance, fieldName, {
  //    get() {
  //      return _value;
  //    },
  //    set(v) {
  //      console.log(v, fieldName);
  //      if (!(v instanceof typeConstructor)) {
  //        throw new Error("value is not instance of " + typeConstructor.toString());
  //      }
  //      _value = v;
  //    },
  //  });
   let list = fieldsMap.get(instance);
   if (list === undefined) {
    fieldsMap.set(instance, list = []);
   }

   list.push({
     index: options?.index ?? true,
     fieldName: fieldName,
     unique: options?.unique ?? false,
     type: String
   });

  }
}


