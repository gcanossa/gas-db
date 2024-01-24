import { ContextMetadataStore, DataRangeDescriptor } from "./context";
import { RangeHeaders } from "./core";
import { ColumnsMapping, PropOfTypeNames, Sequence } from "./schema";

export function trimIndex(index: number, count: number) {
  if (!count) return 0;
  if (!index) return 0;

  return (count + (index % count)) % count;
}

export function getHeaders(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  params: DataRangeDescriptor
): RangeHeaders {
  const headers = getDataRange(ss, params, 1)?.offset(0, 0, 1)?.getValues()[0];
  if (!headers) throw new Error("Missing header row");

  return headers.reduce(
    (acc, name, index) => ({
      ...acc,
      [name]: index,
    }),
    {}
  );
}

export function getDataRange(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  params: DataRangeDescriptor,
  rowCount?: number
) {
  const range =
    "sheetName" in params
      ? ss.getSheetByName(params.sheetName)?.getDataRange() ?? null
      : "rangeName" in params
      ? ss
          .getRangeByName(params.rangeName)
          ?.getDataRegion(SpreadsheetApp.Dimension.ROWS) ?? null
      : "a1NotationRange" in params
      ? ss
          .getRange(params.a1NotationRange)
          ?.getDataRegion(SpreadsheetApp.Dimension.ROWS) ?? null
      : null;

  return rowCount !== undefined ? range?.offset(0, 0, rowCount) : range;
}

export function shouldHaveHeaders<T extends ColumnsMapping>(columns: T) {
  return (
    !!columns &&
    !!Object.keys(columns).find((k) => typeof columns[k].id === "string")
  );
}

export type Context<T extends ColumnsMapping> = {
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  rangeDef: DataRangeDescriptor;
  columnsDef: ColumnsMapping;
  offsetTop: number;
  rowCount: number;
  dataRange: GoogleAppsScript.Spreadsheet.Range;
  headers: RangeHeaders | null;
  sequences: PropOfTypeNames<T, Sequence>[];
  checkboxes: number[];
  links: number[];
  metadata: ContextMetadataStore;
};

const objectStore: [any, any][] = [];

export function createObjectRef(obj: any): any {
  const ref = {};
  objectStore.push([ref, obj]);

  return ref;
}

export function getObject(ref: any): any {
  return objectStore.find(([r]) => r == ref)?.[1];
}

export function freeObjectRef(ref: any) {
  const idx = objectStore.findIndex(([r]) => r == ref);
  if (idx >= 0) objectStore.splice(idx, 1);
}
