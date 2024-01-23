import { RangeHeaders, Context } from "./context";
import {
  ColumnDef,
  ColumnDefKind,
  ColumnValueType,
  ColumnsMapping,
  Link,
  PropOfTypeNames,
  Sequence,
} from "./schema";

export type RowObject<T> = T extends ColumnsMapping
  ? {
      [K in keyof T]: T[K] extends ColumnDef<infer V>
        ? V extends "sequence"
          ? number
          : V extends "link"
          ? Link
          : V
        : never;
    }
  : never;

export type NewRowObject<T> = T extends ColumnsMapping
  ? {
      [K in Exclude<
        keyof T,
        PropOfTypeNames<T, Sequence>
      >]: T[K] extends ColumnDef<infer V>
        ? V extends "link"
          ? Link
          : V
        : never;
    }
  : never;

export type UpdateRowObject<T> = T extends ColumnsMapping
  ? Partial<NewRowObject<T>>
  : never;

export function getColumnIndex(
  [type, colId]: ColumnDefKind,
  headers: RangeHeaders = {}
) {
  return typeof colId === "number"
    ? colId
    : typeof colId === "string"
    ? headers[colId]
    : headers["*"];
}

export function entityFromRow<T>(
  row: ColumnValueType[],
  columns: ColumnsMapping,
  headers: RangeHeaders = {}
): RowObject<T> {
  return Object.keys(columns).reduce((entity, prop) => {
    if (columns[prop] === null)
      throw new Error(`Missing mapping information for column '${prop}'`);

    const idx = getColumnIndex(columns[prop], headers);
    if (columns[prop][0] == "link" && !!row[idx]) {
      const mc = (row[idx] as string).match(
        /=HYPERLINK\("([^,]*)"(\s*,\s*"(.*)")?\)/
      );
      entity[prop] = {
        url: mc[1].trim(),
        label: mc[3]?.trim(),
      };
    } else {
      entity[prop] = row[idx];
    }

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
        index: getColumnIndex(columns[prop], headers),
      };
    })
    .filter((p) => p.index !== undefined)
    .sort((a, b) => a.index! - b.index!);

  return sortedProps.reduce((row, sortedProp) => {
    while (row.length < sortedProp.index!) row.push(null);

    let value = (entity[sortedProp.prop] as ColumnValueType) ?? null;
    if (columns[sortedProp.prop][0] == "link" && !!value) {
      const lnk = value as any as Link;
      value = `=HYPERLINK("${lnk.url}"${lnk.label ? `,"${lnk.label}"` : ""})`;
    }
    row.push(value);

    return row;
  }, [] as ColumnValueType[]);
}
function seqEntryName<T extends ColumnsMapping>(
  ctx: Context<T>,
  key: PropOfTypeNames<T, Sequence>
): string {
  return Utilities.base64Encode(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      `${ctx.spreadsheet.getId()}/${JSON.stringify(ctx.range)}/${String(key)}`
    )
  );
}

export function seqCurrent<T extends ColumnsMapping>(
  ctx: Context<T>,
  key: PropOfTypeNames<T, Sequence>
): number | null {
  const value = ctx.propStore.getProperty(seqEntryName(ctx, key));
  return !value ? null : parseInt(value);
}
export function seqNext<T extends ColumnsMapping>(
  ctx: Context<T>,
  key: PropOfTypeNames<T, Sequence>
): number {
  const entryName = seqEntryName(ctx, key);
  const value = ctx.propStore.getProperty(entryName);
  const nextValue = !value ? 1 : parseInt(value) + 1;

  ctx.propStore.setProperty(entryName, `${nextValue}`);
  return nextValue;
}
export function seqReset<T extends ColumnsMapping>(
  ctx: Context<T>,
  key: PropOfTypeNames<T, Sequence>,
  value?: number
): void {
  ctx.propStore.setProperty(seqEntryName(ctx, key), `${value ?? 0}`);
}
