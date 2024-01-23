import {
  NewRowObject,
  RowObject,
  UpdateRowObject,
  entityFromRow,
  getColumnIndex,
  rowFromEntity,
  seqNext,
} from "./core";
import {
  ColumnValueType,
  ColumnsMapping,
  PropOfTypeNames,
  Sequence,
} from "./schema";
import { trimIndex } from "./utils";

export type DataRangeDescriptor =
  | { sheetName: string }
  | { rangeName: string }
  | { a1NotationRange: string };

export type RangeHeaders = { [key: string]: number };

export type TableContextAction<T extends ColumnsMapping> = {
  type: "add" | "del" | "mod";
  index: number;
  oldValue?: T;
  newValue?: T;
};

export type Context<T extends ColumnsMapping> = {
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  range: DataRangeDescriptor;
  columnsDef: ColumnsMapping;
  offsetTop: number;
  rowCount: number;
  dataRange: GoogleAppsScript.Spreadsheet.Range;
  headers: RangeHeaders | null;
  sequences: PropOfTypeNames<T, Sequence>[];
  checkboxes: number[];
  links: number[];
  propStore: GoogleAppsScript.Properties.Properties;
};

function getHeaders(
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

function getDataRange(
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

function shouldHaveHeaders<T extends ColumnsMapping>(columns: T) {
  return (
    !!columns &&
    !!Object.keys(columns).find((k) => typeof columns[k][1] === "string")
  );
}
export const createContext = <T extends ColumnsMapping>(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  range: DataRangeDescriptor,
  columns: ColumnsMapping
): Context<T> => {
  const withHeaders = shouldHaveHeaders(columns);
  const offsetTop = withHeaders ? 1 : 0;
  const dataRange = getDataRange(spreadsheet, range);
  let rowCount = dataRange.getNumRows() - offsetTop;

  const headers = withHeaders ? getHeaders(spreadsheet, range) : null;

  if (rowCount == 1) {
    const firstRow = dataRange.offset(offsetTop, 0, 1).getValues()[0];
    rowCount = !!firstRow.find((p) => p != "") ? rowCount : 0;
  }

  const sequences = Object.keys(columns).filter(
    (key) => columns[key][0] === "sequence"
  ) as PropOfTypeNames<T, Sequence>[];

  const checkboxes: number[] = Object.keys(columns)
    .filter((key) => columns[key][0] === "boolean")
    .map((key) => getColumnIndex(columns[key], headers));

  const links: number[] = Object.keys(columns)
    .filter((key) => columns[key][0] === "link")
    .map((key) => getColumnIndex(columns[key], headers));

  const prop =
    PropertiesService.getDocumentProperties() ??
    PropertiesService.getScriptProperties();

  const ctx: Context<T> = {
    spreadsheet: spreadsheet,
    range: range,
    columnsDef: columns,
    rowCount: rowCount,
    headers: headers,
    dataRange: dataRange,
    offsetTop: offsetTop,
    propStore: prop,
    sequences: sequences,
    checkboxes: checkboxes,
    links: links,
  };

  return ctx;
};

export function read<T extends ColumnsMapping>(
  ctx: Context<T>
): RowObject<T>[] {
  const dataRange =
    ctx.rowCount > 0
      ? ctx.dataRange.offset(ctx.offsetTop, 0, ctx.rowCount).getValues() ?? []
      : [];

  if (ctx.links.length > 0 && dataRange.length > 0) {
    ctx.links.forEach((lnkIdx) => {
      const formulas = ctx.dataRange
        .offset(ctx.offsetTop, lnkIdx, ctx.rowCount, 1)
        .getFormulas();

      dataRange.forEach((row, rIdx) => {
        row[lnkIdx] = formulas[rIdx][0];
      });
    });
  }

  return dataRange.map((row) =>
    entityFromRow(row, ctx.columnsDef, ctx.headers)
  );
}

export function count<T extends ColumnsMapping>(ctx: Context<T>): number {
  return ctx.rowCount;
}

export function insertAt<T extends ColumnsMapping>(
  ctx: Context<T>,
  inserts: NewRowObject<T> | NewRowObject<T>[],
  index: number,
  append?: boolean
): void {
  index = trimIndex(index, ctx.rowCount);

  const appendOffset = append ? 1 : 0;
  const items = Array.isArray(inserts) ? inserts : [inserts];

  const rows: ColumnValueType[][] = items.map((item) => {
    ctx.sequences.map((key) => {
      (item as Record<keyof T, any>)[key] = seqNext(ctx, key);
    });
    return rowFromEntity<T>(
      item as any as Partial<RowObject<T>>,
      ctx.columnsDef,
      ctx.headers
    );
  });

  const newRange = ctx.dataRange.offset(index + ctx.offsetTop - 1, 0, 2);

  let formulas = newRange.offset(1, 0, 1).getFormulas()[0];
  let formulaFromAbove = false;
  if (!formulas.find((p) => p != "")) {
    formulas = newRange.offset(0, 0, 1).getFormulas()[0];
    formulaFromAbove = true;
  }

  if (!!formulas.find((p) => p != "")) {
    rows.forEach((row, rIdx) => {
      formulas.map((p, cIdx) => {
        if (p != "" && !ctx.links.includes(cIdx)) {
          Array.from(p.matchAll(/([A-Z]+)([0-9]+)/g)).map((m) => {
            p = p.replace(
              m[0],
              `${m[1]}${
                parseInt(m[2]) +
                (formulaFromAbove ? rIdx + 1 : rIdx) +
                appendOffset
              }`
            );
          });

          row[cIdx] = p;
        }
      });
    });
  }

  rows.forEach(() =>
    newRange
      .offset(1 + appendOffset, 0, 1)
      .insertCells(SpreadsheetApp.Dimension.ROWS)
  );
  ctx.checkboxes.forEach((idx) => {
    newRange.offset(1 + appendOffset, idx, rows.length, 1).insertCheckboxes();
  });
  newRange.offset(1 + appendOffset, 0, rows.length).setValues(rows);

  ctx.rowCount += rows.length;
}

export function deleteAt<T extends ColumnsMapping>(
  ctx: Context<T>,
  index: number,
  count: number = 1
): void {
  if (count <= 0) return;
  index = trimIndex(index, ctx.rowCount);
  const oldRange = ctx.dataRange.offset(index + ctx.offsetTop, 0, count);
  oldRange.deleteCells(SpreadsheetApp.Dimension.ROWS);
  ctx.rowCount -= count;
}

export function updateAt<T extends ColumnsMapping>(
  ctx: Context<T>,
  updates: UpdateRowObject<T> | UpdateRowObject<T>[],
  index: number
): void {
  index = trimIndex(index, ctx.rowCount);

  (Array.isArray(updates) ? updates : [updates]).forEach((item, rIdx) => {
    let row = rowFromEntity<T>(
      item as any as Partial<RowObject<T>>,
      ctx.columnsDef,
      ctx.headers
    );

    const newRange = ctx.dataRange.offset(index + ctx.offsetTop + rIdx, 0, 1);
    row.forEach((value, cIdx) => {
      if (value !== null) newRange.offset(0, cIdx, 1, 1).setValue(value);
    });
  });
}
