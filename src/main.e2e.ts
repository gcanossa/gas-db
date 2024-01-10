import {
  ColumnsMapping,
  createTableContext,
  createTableManagedContext,
  entityFromRow,
  numberCol,
  RangeHeaders,
  rowFromEntity,
  stringCol,
} from "./sheets-orm";

function test() {
  const SPREADSHEET_ID = null;

  const ss = !SPREADSHEET_ID
    ? SpreadsheetApp.getActive()
    : SpreadsheetApp.openById(SPREADSHEET_ID);

  const entity = {
    id: 3,
    name: "test",
    score: 1234,
  };

  const mapping = {
    id: numberCol("Num"),
    name: stringCol(1),
    score: numberCol("Rank"),
  };

  const headers: RangeHeaders = {
    Num: 0,
    Rank: 4,
  };

  const table_context = createTableContext<typeof mapping>(
    ss,
    { sheetName: "table" },
    mapping
  );

  table_context.append(entity);

  const named_range_context = createTableContext<typeof mapping>(
    ss,
    { rangeName: "table" },
    mapping
  );
  named_range_context.append(entity);

  const a1_range_context = createTableContext<typeof mapping>(
    ss,
    { a1NotationRange: "ranges!N5:R5" },
    mapping
  );
  a1_range_context.append(entity);

  console.log(a1_range_context.list());
}
