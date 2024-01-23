export type Sequence = { sequence: number };

export type LinkAllowedSchema =
  | "http"
  | "https"
  | "mailto"
  | "aim"
  | "ftp"
  | "gopher"
  | "telnet"
  | "news";

export type Link = {
  url: `${LinkAllowedSchema}://${string}`;
  label?: string;
};

export type ColumnValueType =
  | Sequence
  | Link
  | string
  | number
  | boolean
  | Date
  | null;

export type ColumnValueTypeNames =
  | "sequence"
  | "link"
  | "string"
  | "number"
  | "boolean"
  | "date";

export type ColumnValueTypeName<T extends ColumnValueType> = T extends Sequence
  ? "sequence"
  : T extends Link
  ? "link"
  : T extends string
  ? "string"
  : T extends number
  ? "number"
  : T extends boolean
  ? "boolean"
  : T extends Date
  ? "date"
  : never;

export type ColumnDef<T extends ColumnValueType> = [
  ColumnValueTypeName<T>,
  number | string
];
export type ColumnDefKind = ColumnDef<ColumnValueType>;

export type PropOfTypeNames<T extends ColumnsMapping, P> = {
  [K in keyof T]: T[K] extends ColumnDef<infer V>
    ? V extends P
      ? K
      : never
    : never;
}[keyof T];

export type ColumnsMapping = {
  [key: string]: ColumnDefKind;
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

export function sequenceCol(id: number | string): ColumnDef<Sequence> {
  return ["sequence", id];
}

export function linkCol(id: number | string): ColumnDef<Link> {
  return ["link", id];
}
