



declare type Constructor<T = any> = new (...args: any[]) => T;


export interface PrimaryMapValue {
  fieldName: string[];
  autoIncrement: boolean;
}
export const primaryKeyMap = new Map<InstanceType<Constructor>, PrimaryMapValue>();



export type Types = StringConstructor |
  BooleanConstructor |
  NumberConstructor |
  DateConstructor |
  ArrayConstructor |
  ObjectConstructor;

export interface FieldMapValue {
  fieldName: string;
  index: boolean | string;
  unique: boolean;
  type: Types;
}


export interface TableField {
  index: boolean | string;
  unique?: boolean;
  type?: Types;
  primaryKey?: boolean;
  autoIncrement?: boolean;
}

export const fieldsMap = new Map<InstanceType<Constructor>, FieldMapValue[]>();
