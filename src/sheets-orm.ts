export type CellValueType = 
  | string
  | number
  | boolean
  | Date
  | null;

export type StringFromType<T extends CellValueType> = 
  T extends string ? 'string' :
  T extends number ? 'number' :
  T extends boolean ? 'boolean' :
  T extends Date ? 'date' :
  never;

export type ColumnIdentifier = 
  | { colIndex : number } 
  | { headerName : string };

export function getColumnId(column: ColumnIdentifier): number | string | null {
  return 'colIndex' in column ? column.colIndex
    : 'headerName' in column ? column.headerName
    : null;
}

export type RowObject = { [ key: string]: CellValueType };

export type EntityPropertyMapping<T extends CellValueType> = {
  type: StringFromType<T>;
} & ColumnIdentifier;

export type ColumnsMapping<T extends RowObject> = { 
  [K in keyof T]: T[K] extends CellValueType ? EntityPropertyMapping<T[K]> : never
}

export type TableReadContext<T extends RowObject> = {
  list(): T[];
  where(predicate: (p:T) => boolean): {index:number, item:T}[];
  find(predicate: (p:T) => boolean): T | null;
  findIndex(predicate: (p:T) => boolean): number;
}

export type TableWriteContext<T extends RowObject> = {
  append(item: T): void;
  prepend(item: T): void;
  insertAt(item: T, index:number): void;
  deleteAt(index: number): void;
  deleteAll(): void;
  updateAt(item: Partial<T>, index:number): void;
}

export type TableContext<T extends RowObject> = TableReadContext<T> & TableWriteContext<T>;

export type DataRangeDescriptor = 
  | { sheetName: string; }
  | { rangeName: string }
  | { a1NotationRange: string } ;

export type RangeHeaders = { [key: string]: number }

export const getHeaders = (ss: GoogleAppsScript.Spreadsheet.Spreadsheet, params:DataRangeDescriptor): RangeHeaders => {
  const headers = getDataRange(ss, params, 1)?.offset(0,0,1)?.getValues()[0];
  if(!headers)
    throw new Error("Missing header row");

  const indexes:any = {};
  headers.forEach((name, index) => { indexes[name]=index; });

  return indexes
}

export const getDataRange = (ss: GoogleAppsScript.Spreadsheet.Spreadsheet, params:DataRangeDescriptor, rowCount?:number) => {
  const range = 
    'sheetName' in params ? ss.getSheetByName(params.sheetName)?.getDataRange() ?? null :
    'rangeName' in params ? ss.getRangeByName(params.rangeName) ?? null :
    'a1NotationRange' in params ? ss.getRange(params.a1NotationRange) ?? null :
    null;

  return rowCount !== undefined ? range?.offset(0,0,rowCount) : range;
}

export const shouldHaveHeaders = <T extends RowObject>(columns:ColumnsMapping<T>) => {
  return !!columns && !!Object.keys(columns).find(k => 'headerName' in columns[k]);
}

export const entityFromRow = <T extends RowObject>(row:CellValueType[], columns:ColumnsMapping<T>, headers:RangeHeaders = {}) => {
  return Object.keys(columns).reduce((entity, prop)=> {
    const colId = getColumnId(columns[prop]);

    if(colId === null)
      throw new Error(`Missing mapping information for column '${prop}'`);

    entity[prop] = typeof colId === 'number' ? row[colId]
      : typeof colId === 'string' ? row[headers[colId]]
      : row[headers['*']];

    return entity;
  }, {} as RowObject) as T
}

export const rowFromEntity = <T extends RowObject>(entity:Partial<T>, columns:ColumnsMapping<T>, headers:RangeHeaders = {}): CellValueType[] => {
  const sortedProps = Object.keys(entity)
    .map(prop => {
      const id = getColumnId(columns[prop]);
      return {
          prop,
          index: typeof id === 'number' ? id 
            : typeof id === 'string' ? headers[id]
            : headers['*']
        }
    })
    .filter(p => p.index !== undefined)
    .sort((a, b) => a.index! - b.index!);
  
  return sortedProps.reduce((row, sortedProp)=> {
    while(row.length < sortedProp.index!)
      row.push(null);

    row.push(entity[sortedProp.prop] ?? null);

    return row;
  }, [] as CellValueType[])
}

export const createTableReadContext = <T extends RowObject>(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  range:DataRangeDescriptor,
  columns: ColumnsMapping<T>): TableReadContext<T> => {
  
  const table = createTableContext<T>(spreadsheet, range, columns);

  const ctx = {
    list: table.list,
    where: table.where,
    find: table.find,
    findIndex: table.findIndex
  };

  return ctx;
};

export const createTableContext = <T extends RowObject>(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  range:DataRangeDescriptor,
  columns: ColumnsMapping<T>): TableContext<T> => {
  
  const withHeaders = shouldHaveHeaders(columns);
  const offsetTop = withHeaders ? 1 : 0;
  let rowCount = (getDataRange(spreadsheet, range)?.getNumRows() ?? 0) - offsetTop;

  if(rowCount == 1){
    const firstRow = (getDataRange(spreadsheet, range)?.offset(offsetTop, 0, 1).getValues() ?? [[]])[0];
    rowCount = !!firstRow.find(p => p!='') ? rowCount : 0;
  }

  const ctx:TableContext<T> = {
    list(): T[] {
      const originalRange = getDataRange(spreadsheet, range);
      const dataRange = rowCount > 0 ?
        originalRange?.offset(offsetTop, 0, rowCount).getValues() ?? [] :
        [];

      if(withHeaders){
        const headers = getHeaders(spreadsheet, range);
  
        return dataRange.map(row => entityFromRow(row, columns, headers));
      }
      else{
        return dataRange.map(row => entityFromRow(row, columns));
      }
    },
    where(predicate: (p: T) => boolean): { index: number; item: T; }[] {
      return ctx.list().map((p,i)=>({ index: i, item: p })).filter(p => predicate(p.item));
    },
    find(predicate: (p: T) => boolean): T | null {
      return ctx.list().find(predicate) ?? null;
    },
    findIndex(predicate: (p: T) => boolean): number {
      return ctx.list().findIndex(predicate);
    },
    append(item: T): void {
      ctx.insertAt(item, rowCount);
    },
    prepend(item: T): void {
      ctx.insertAt(item, 0);
    },
    insertAt(item: T, index: number): void {
      let row: any[] = withHeaders ? rowFromEntity<T>(item, columns, getHeaders(spreadsheet, range)) :
        rowFromEntity<T>(item, columns);

      const newRange = getDataRange(spreadsheet, range)?.offset(index + offsetTop, 0, 1);
      newRange?.insertCells(SpreadsheetApp.Dimension.ROWS);
      newRange?.offset(0, 0, 1).setValues([row]);
      
      rowCount++;
    },
    deleteAt(index: number): void {
      const oldRange = getDataRange(spreadsheet, range)?.offset(index + offsetTop, 0, 1);
      oldRange?.deleteCells(SpreadsheetApp.Dimension.ROWS);
      rowCount--;
    },
    deleteAll():void {
      const originalRange = getDataRange(spreadsheet, range);
      originalRange?.offset(offsetTop, 0, rowCount)?.clear();
        
      rowCount = 0;
    },
    updateAt(item: Partial<T>, index: number): void {
      let row: any[] = withHeaders ? rowFromEntity<T>(item, columns, getHeaders(spreadsheet, range)) :
        rowFromEntity<T>(item, columns);

      const newRange = getDataRange(spreadsheet, range)?.offset(index + offsetTop, 0, 1);
      row.forEach((value, i) => {
        if(value !== null)
          newRange?.offset(0, i, 1, 1).setValue(value);
      });
    }
  }

  return ctx;
}