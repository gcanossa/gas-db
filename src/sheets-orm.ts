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
  ColumnValueTypeName<T>,
  number | string
];

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

export type ColumnsMapping = {
  [key: string]: ColumnDef<ColumnValueType>;
};

export type RowObject<T> = T extends ColumnsMapping
  ? {
      [K in keyof T]: T[K] extends ColumnDef<infer V> ? V : never;
    }
  : never;

export type TableReadContext<T extends ColumnsMapping> = {
  list(): RowObject<T>[];
  where(
    predicate: (p: RowObject<T>) => boolean
  ): { index: number; item: RowObject<T> }[];
  find(predicate: (p: RowObject<T>) => boolean): RowObject<T> | null;
  findIndex(predicate: (p: RowObject<T>) => boolean): number;
};

export type TableWriteContext<T extends ColumnsMapping> = {
  append(item: RowObject<T>): void;
  prepend(item: RowObject<T>): void;
  insertAt(item: RowObject<T>, index: number): void;
  deleteAt(index: number): void;
  deleteAll(): void;
  updateAt(item: Partial<RowObject<T>>, index: number): void;
};

export type TableContext<T extends ColumnsMapping> = TableReadContext<T> &
  TableWriteContext<T>;

export type DataRangeDescriptor =
  | { sheetName: string }
  | { rangeName: string }
  | { a1NotationRange: string };

export type RangeHeaders = { [key: string]: number };

export const getHeaders = (
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  params: DataRangeDescriptor
): RangeHeaders => {
  const headers = getDataRange(ss, params, 1)?.offset(0, 0, 1)?.getValues()[0];
  if (!headers) throw new Error("Missing header row");

  return headers.reduce(
    (acc, name, index) => ({
      ...acc,
      [name]: index,
    }),
    {}
  );
};

export const getDataRange = (
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  params: DataRangeDescriptor,
  rowCount?: number
) => {
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
};

export const shouldHaveHeaders = <T extends ColumnsMapping>(columns: T) => {
  return (
    !!columns &&
    !!Object.keys(columns).find((k) => typeof columns[k][1] === "string")
  );
};

export const entityFromRow = <T>(
  row: ColumnValueType[],
  columns: ColumnsMapping,
  headers: RangeHeaders = {}
): RowObject<T> => {
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
};

export const rowFromEntity = <T>(
  entity: Partial<RowObject<T>>,
  columns: ColumnsMapping,
  headers: RangeHeaders = {}
): ColumnValueType[] => {
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
};

export const createTableReadContext = <T extends ColumnsMapping>(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  range: DataRangeDescriptor,
  columns: ColumnsMapping
): TableReadContext<T> => {
  const table = createTableContext<T>(spreadsheet, range, columns);

  const ctx = {
    list: table.list,
    where: table.where,
    find: table.find,
    findIndex: table.findIndex,
  };

  return ctx;
};

export const createTableContext = <T extends ColumnsMapping>(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  range: DataRangeDescriptor,
  columns: ColumnsMapping
): TableContext<T> => {
  const withHeaders = shouldHaveHeaders(columns);
  const offsetTop = withHeaders ? 1 : 0;
  let rowCount =
    (getDataRange(spreadsheet, range)?.getNumRows() ?? 0) - offsetTop;

  if (rowCount == 1) {
    const firstRow = (getDataRange(spreadsheet, range)
      ?.offset(offsetTop, 0, 1)
      .getValues() ?? [[]])[0];
    rowCount = !!firstRow.find((p) => p != "") ? rowCount : 0;
  }

  const ctx: TableContext<T> = {
    list(): RowObject<T>[] {
      const originalRange = getDataRange(spreadsheet, range);
      const dataRange =
        rowCount > 0
          ? originalRange?.offset(offsetTop, 0, rowCount).getValues() ?? []
          : [];

      if (withHeaders) {
        const headers = getHeaders(spreadsheet, range);

        return dataRange.map((row) => entityFromRow(row, columns, headers));
      } else {
        return dataRange.map((row) => entityFromRow(row, columns));
      }
    },
    where(
      predicate: (p: RowObject<T>) => boolean
    ): { index: number; item: RowObject<T> }[] {
      return ctx
        .list()
        .map((p, i) => ({ index: i, item: p }))
        .filter((p) => predicate(p.item));
    },
    find(predicate: (p: RowObject<T>) => boolean): RowObject<T> | null {
      return ctx.list().find(predicate) ?? null;
    },
    findIndex(predicate: (p: RowObject<T>) => boolean): number {
      return ctx.list().findIndex(predicate);
    },
    append(item: RowObject<T>): void {
      ctx.insertAt(item, rowCount);
    },
    prepend(item: RowObject<T>): void {
      ctx.insertAt(item, 0);
    },
    insertAt(item: RowObject<T>, index: number): void {
      let row: ColumnValueType[] = withHeaders
        ? rowFromEntity<T>(item, columns, getHeaders(spreadsheet, range))
        : rowFromEntity<T>(item, columns);

      const newRange = getDataRange(spreadsheet, range)?.offset(
        index + offsetTop,
        0,
        1
      );
      newRange?.insertCells(SpreadsheetApp.Dimension.ROWS);
      newRange?.offset(0, 0, 1).setValues([row]);

      rowCount++;
    },
    deleteAt(index: number): void {
      const oldRange = getDataRange(spreadsheet, range)?.offset(
        index + offsetTop,
        0,
        1
      );
      oldRange?.deleteCells(SpreadsheetApp.Dimension.ROWS);
      rowCount--;
    },
    deleteAll(): void {
      const originalRange = getDataRange(spreadsheet, range);
      originalRange?.offset(offsetTop, 0, rowCount)?.clear();

      rowCount = 0;
    },
    updateAt(item: Partial<RowObject<T>>, index: number): void {
      let row: any[] = withHeaders
        ? rowFromEntity<T>(item, columns, getHeaders(spreadsheet, range))
        : rowFromEntity<T>(item, columns);

      const newRange = getDataRange(spreadsheet, range)?.offset(
        index + offsetTop,
        0,
        1
      );
      row.forEach((value, i) => {
        if (value !== null) newRange?.offset(0, i, 1, 1).setValue(value);
      });
    },
  };

  return ctx;
};
