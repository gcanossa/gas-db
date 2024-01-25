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

export type ColumnDef<T extends ColumnValueType> = {
  type: ColumnValueTypeName<T>;
  id: number | string;
};
export type ColumnDefKind = ColumnDef<ColumnValueType>;

export type PkColumnDef<T extends ColumnValueType> = ColumnDef<T> & {
  pk: true;
};
export type ReadOnlyColumnDef<T extends ColumnValueType> = ColumnDef<T> & {
  ro: true;
};
export type FormulaColumnDef<T extends ColumnValueType> =
  ReadOnlyColumnDef<T> & {
    frm: true;
  };

export type ColumnDefVariant<T extends ColumnValueType> =
  | ColumnDef<T>
  | PkColumnDef<T>
  | ReadOnlyColumnDef<T>
  | FormulaColumnDef<T>;

export type PropOfTypeNames<T extends ColumnsMapping, P> = {
  [K in keyof T]: T[K] extends ColumnDefVariant<infer V>
    ? V extends P
      ? K
      : never
    : never;
}[keyof T];

export type PropOfVariantNames<
  T extends ColumnsMapping,
  P extends ColumnDefVariant<any>
> = {
  [K in keyof T]: T[K] extends P ? K : never;
}[keyof T];

export type ColumnsMapping = {
  [key: string]: ColumnDefKind;
};

export function primaryKey<T extends ColumnValueType>(
  def: ColumnDef<T>
): PkColumnDef<T> {
  return { ...def, pk: true };
}

export function readonly<T extends ColumnValueType>(
  def: ColumnDef<T>
): ReadOnlyColumnDef<T> {
  return { ...def, ro: true };
}

export function formula<T extends ColumnValueType>(
  def: ColumnDef<T>
): FormulaColumnDef<T> {
  return { ...def, ro: true, frm: true };
}

export function stringCol(id: number | string): ColumnDef<string> {
  return { type: "string", id };
}

export function numberCol(id: number | string): ColumnDef<number> {
  return { type: "number", id };
}

export function booleanCol(id: number | string): ColumnDef<boolean> {
  return { type: "boolean", id };
}

export function dateCol(id: number | string): ColumnDef<Date> {
  return { type: "date", id };
}

export function sequenceCol(id: number | string): ColumnDef<Sequence> {
  return { type: "sequence", id };
}

export function linkCol(id: number | string): ColumnDef<Link> {
  return { type: "link", id };
}
