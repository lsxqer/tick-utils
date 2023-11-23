export interface PrimaryMapValue {
    fieldName: string[];
    autoIncrement: boolean;
}
export declare const primaryKeyMap: Map<any, PrimaryMapValue>;
export type Types = StringConstructor | BooleanConstructor | NumberConstructor | DateConstructor | ArrayConstructor | ObjectConstructor;
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
export declare const fieldsMap: Map<any, FieldMapValue[]>;
