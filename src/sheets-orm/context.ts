import {
  NewRowObject,
  RowObject,
  UpdateRowObject,
  entityFromRow,
  getColumnIndex,
  rowFromEntity,
} from "./core";
import {
  ColumnValueType,
  ColumnsMapping,
  PropOfTypeNames,
  Sequence,
} from "./schema";
import { seqNext } from "./sequences";
import {
  Context,
  createObjectRef,
  getDataRange,
  getHeaders,
  getObject,
  shouldHaveHeaders,
  trimIndex,
} from "./utils";

export type DataRangeDescriptor =
  | { sheetName: string }
  | { rangeName: string }
  | { a1NotationRange: string };

export type ContextMetadataStore = {
  get(key: string): string | null;
  set(key: string, value: string): void;
};

export type ContextRef<T extends ColumnsMapping> = { __brand: "ContextRef<T>" };

export function createContext<T extends ColumnsMapping>(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  range: DataRangeDescriptor,
  columns: ColumnsMapping,
  metadata?: ContextMetadataStore
): ContextRef<T> {
  const withHeaders = shouldHaveHeaders(columns);
  const offsetTop = withHeaders ? 1 : 0;
  const headers = withHeaders ? getHeaders(spreadsheet, range) : null;

  const dataRange = getDataRange(spreadsheet, range);
  let rowCount = dataRange.getNumRows() - offsetTop;

  if (rowCount == 1) {
    const firstRow = dataRange.offset(offsetTop, 0, 1).getValues()[0];
    rowCount = !!firstRow.find((p) => p != "") ? rowCount : 0;
  }

  const sequences = Object.keys(columns).filter(
    (key) => columns[key].type === "sequence"
  ) as PropOfTypeNames<T, Sequence>[];

  const checkboxes: number[] = Object.keys(columns)
    .filter((key) => columns[key].type === "boolean")
    .map((key) => getColumnIndex(columns[key], headers));

  const links: number[] = Object.keys(columns)
    .filter((key) => columns[key].type === "link")
    .map((key) => getColumnIndex(columns[key], headers));

  if (!metadata) {
    const prop =
      PropertiesService.getDocumentProperties() ??
      PropertiesService.getScriptProperties();
    metadata = {
      get(key: string): string | null {
        return prop.getProperty(key);
      },
      set(key: string, value: string) {
        prop.setProperty(key, value);
      },
    };
  }

  const ctx: Context<T> = {
    spreadsheet: spreadsheet,
    rangeDef: range,
    columnsDef: columns,
    rowCount: rowCount,
    headers: headers,
    dataRange: dataRange,
    offsetTop: offsetTop,
    metadata: metadata,
    sequences: sequences,
    checkboxes: checkboxes,
    links: links,
  };

  return createObjectRef(ctx);
}

export function read<T extends ColumnsMapping>(
  ctx: ContextRef<T>
): RowObject<T>[] {
  const pctx: Context<T> = getObject(ctx);

  const dataRange =
    pctx.rowCount > 0
      ? pctx.dataRange.offset(pctx.offsetTop, 0, pctx.rowCount).getValues() ??
        []
      : [];

  if (pctx.links.length > 0 && dataRange.length > 0) {
    pctx.links.forEach((lnkIdx) => {
      const formulas = pctx.dataRange
        .offset(pctx.offsetTop, lnkIdx, pctx.rowCount, 1)
        .getFormulas();

      dataRange.forEach((row, rIdx) => {
        row[lnkIdx] = formulas[rIdx][0];
      });
    });
  }

  return dataRange.map((row) =>
    entityFromRow(row, pctx.columnsDef, pctx.headers)
  );
}

export function count<T extends ColumnsMapping>(ctx: ContextRef<T>): number {
  const pctx: Context<T> = getObject(ctx);
  return pctx.rowCount;
}

export function insertAt<T extends ColumnsMapping>(
  ctx: ContextRef<T>,
  inserts: NewRowObject<T> | NewRowObject<T>[],
  index: number,
  append?: boolean
): void {
  const pctx: Context<T> = getObject(ctx);
  index = trimIndex(index, pctx.rowCount);

  const appendOffset = append ? 1 : 0;
  const items = Array.isArray(inserts) ? inserts : [inserts];

  const rows: ColumnValueType[][] = items.map((item) => {
    pctx.sequences.map((key) => {
      (item as Record<keyof T, any>)[key] = seqNext(ctx, key);
    });
    return rowFromEntity<T>(
      item as any as Partial<RowObject<T>>,
      pctx.columnsDef,
      pctx.headers
    );
  });

  const newRange = pctx.dataRange.offset(index + pctx.offsetTop - 1, 0, 2);

  let formulas = newRange.offset(1, 0, 1).getFormulas()[0];
  let formulaFromAbove = false;
  if (!formulas.find((p) => p != "")) {
    formulas = newRange.offset(0, 0, 1).getFormulas()[0];
    formulaFromAbove = true;
  }

  if (!!formulas.find((p) => p != "")) {
    rows.forEach((row, rIdx) => {
      formulas.map((p, cIdx) => {
        if (p != "" && !pctx.links.includes(cIdx)) {
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
  pctx.checkboxes.forEach((idx) => {
    newRange.offset(1 + appendOffset, idx, rows.length, 1).insertCheckboxes();
  });
  newRange.offset(1 + appendOffset, 0, rows.length).setValues(rows);

  pctx.rowCount += rows.length;
}

export function deleteAt<T extends ColumnsMapping>(
  ctx: ContextRef<T>,
  index: number,
  count: number = 1
): void {
  const pctx: Context<T> = getObject(ctx);
  if (count <= 0) return;
  index = trimIndex(index, pctx.rowCount);
  const oldRange = pctx.dataRange.offset(index + pctx.offsetTop, 0, count);
  oldRange.deleteCells(SpreadsheetApp.Dimension.ROWS);
  pctx.rowCount -= count;
}

export function updateAt<T extends ColumnsMapping>(
  ctx: ContextRef<T>,
  updates: UpdateRowObject<T> | UpdateRowObject<T>[],
  index: number
): void {
  const pctx: Context<T> = getObject(ctx);
  index = trimIndex(index, pctx.rowCount);

  (Array.isArray(updates) ? updates : [updates]).forEach((item, rIdx) => {
    let row = rowFromEntity<T>(
      item as any as Partial<RowObject<T>>,
      pctx.columnsDef,
      pctx.headers
    );

    const newRange = pctx.dataRange.offset(index + pctx.offsetTop + rIdx, 0, 1);
    row.forEach((value, cIdx) => {
      if (value !== null) newRange.offset(0, cIdx, 1, 1).setValue(value);
    });
  });
}
