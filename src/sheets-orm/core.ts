import { RangeHeaders, SequenceNames, Context } from "./context";
import { ColumnDef, ColumnValueType, ColumnsMapping } from "./schema";

export type RowObject<T> = T extends ColumnsMapping
  ? {
      [K in keyof T]: T[K] extends ColumnDef<infer V>
        ? V extends "sequence"
          ? number
          : V
        : never;
    }
  : never;

export type NewRowObject<T> = T extends ColumnsMapping
  ? {
      [K in Exclude<keyof T, SequenceNames<T>>]: T[K] extends ColumnDef<infer V>
        ? V
        : never;
    }
  : never;

export type UpdateRowObject<T> = T extends ColumnsMapping
  ? Partial<NewRowObject<T>>
  : never;

export function entityFromRow<T>(
  row: ColumnValueType[],
  columns: ColumnsMapping,
  headers: RangeHeaders = {}
): RowObject<T> {
  return Object.keys(columns).reduce((entity, prop) => {
    const colId = columns[prop][1];

    if (colId === null)
      throw new Error(`Missing mapping information for column '${prop}'`);

    entity[prop] =
      typeof colId === "number"
        ? row[colId]
        : typeof colId === "string"
        ? row[headers[colId]]
        : row[headers["*"]];

    return entity;
  }, {}) as RowObject<T>;
}

export function rowFromEntity<T>(
  entity: Partial<RowObject<T>>,
  columns: ColumnsMapping,
  headers: RangeHeaders = {}
): ColumnValueType[] {
  const sortedProps = Object.keys(entity)
    .map((prop) => {
      const id = columns[prop][1];
      return {
        prop,
        index:
          typeof id === "number"
            ? id
            : typeof id === "string"
            ? headers[id]
            : headers["*"],
      };
    })
    .filter((p) => p.index !== undefined)
    .sort((a, b) => a.index! - b.index!);

  return sortedProps.reduce((row, sortedProp) => {
    while (row.length < sortedProp.index!) row.push(null);

    row.push(entity[sortedProp.prop] ?? null);

    return row;
  }, [] as ColumnValueType[]);
}
function seqEntryName<T extends ColumnsMapping>(
  ctx: Context<T>,
  key: SequenceNames<T>
): string {
  return Utilities.base64Encode(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      `${ctx.spreadsheet.getId()}/${JSON.stringify(ctx.range)}/${key}`
    )
  );
}

export function seqCurrent<T extends ColumnsMapping>(
  ctx: Context<T>,
  key: SequenceNames<T>
): number | null {
  const value = ctx.propStore.getProperty(seqEntryName(ctx, key));
  return !value ? null : parseInt(value);
}
export function seqNext<T extends ColumnsMapping>(
  ctx: Context<T>,
  key: SequenceNames<T>
): number {
  const entryName = seqEntryName(ctx, key);
  const value = ctx.propStore.getProperty(entryName);
  const nextValue = !value ? 1 : parseInt(value) + 1;

  ctx.propStore.setProperty(entryName, `${nextValue}`);
  return nextValue;
}
export function seqReset<T extends ColumnsMapping>(
  ctx: Context<T>,
  key: SequenceNames<T>,
  value?: number
): void {
  ctx.propStore.setProperty(seqEntryName(ctx, key), `${value ?? 0}`);
}
