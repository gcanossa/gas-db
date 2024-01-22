export type ColumnValueType = string | number | boolean | Date | null;
export type ColumnValueTypeName<T extends ColumnValueType> = T extends string
  ? "string"
  : T extends number
  ? "number"
  : T extends boolean
  ? "boolean"
  : T extends Date
  ? "date"
  : never;

export type ColumnDef<T extends ColumnValueType> = [
  ColumnValueTypeName<T> | "sequence",
  number | string
];
export type ColumnsMapping = {
  [key: string]: ColumnDef<ColumnValueType> | ColumnDef<"sequence">;
};
export function stringCol(id: number | string): ColumnDef<string> {
  return ["string", id];
}

export function numberCol(id: number | string): ColumnDef<number> {
  return ["number", id];
}

export function booleanCol(id: number | string): ColumnDef<boolean> {
  return ["boolean", id];
}

export function dateCol(id: number | string): ColumnDef<Date> {
  return ["date", id];
}

export function sequenceCol(id: number | string): ColumnDef<"sequence"> {
  return ["sequence", id];
}
