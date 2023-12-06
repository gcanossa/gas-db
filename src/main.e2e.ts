import { ColumnsMapping, createTableContext, entityFromRow, RangeHeaders, rowFromEntity } from './sheets-orm';

function test(){
  const SPREADSHEET_ID = null;

  const ss = !SPREADSHEET_ID ? SpreadsheetApp.getActive() : SpreadsheetApp.openById(SPREADSHEET_ID);

  const entity = {
    id: 3,
    name: 'test',
    score: 1234
  };

  const mapping: ColumnsMapping<typeof entity> = {
    id: {type:'number', headerName:'Num'},
    name: {type: 'string', colIndex: 1},
    score: {type: 'number', headerName: 'Rank'}
  };

  const headers: RangeHeaders = {
    Num:0,
    Rank:4
  };

  const table_context = createTableContext<typeof entity>(ss, { sheetName: "table" }, mapping);

  table_context.append(entity);
  
  const named_range_context = createTableContext<typeof entity>(ss, { rangeName: "table" }, mapping);
  named_range_context.append(entity);
  
  const a1_range_context = createTableContext<typeof entity>(ss, { a1NotationRange: "ranges!N5:R5" }, mapping);
  a1_range_context.append(entity);

  console.log(a1_range_context.list());
}