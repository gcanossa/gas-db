import {
  ColumnsMapping,
  createTableContext,
  entityFromRow,
  RangeHeaders,
  rowFromEntity,
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

  const mapping: ColumnsMapping<typeof entity> = {
    id: { type: "number", headerName: "Num" },
    name: { type: "string", colIndex: 1 },
    score: { type: "number", headerName: "Rank" },
  };

  const headers: RangeHeaders = {
    Num: 0,
    Rank: 4,
  };

  const table_context = createTableContext<typeof entity>(
    ss,
    { sheetName: "table" },
    mapping
  );

  table_context.append(entity);

  const named_range_context = createTableContext<typeof entity>(
    ss,
    { rangeName: "table" },
    mapping
  );
  named_range_context.append(entity);

  const a1_range_context = createTableContext<typeof entity>(
    ss,
    { a1NotationRange: "ranges!N5:R5" },
    mapping
  );
  a1_range_context.append(entity);

  console.log(a1_range_context.list());

  const test_context = createTableContext<typeof mapping>(
    ss,
    { a1NotationRange: "ranges!A1:E1" },
    mapping
  );

  const test_managed_context =
    createTableManagedContext<typeof mapping>(test_context);

  test_context.append({ id: 1, name: "uno", score: 1 });
  test_context.append({ id: 2, name: "uno", score: 2 });
  test_context.append({ id: 3, name: "uno", score: 3 });

  console.log(test_context.list());

  let items = test_managed_context.list();

  console.log(items);

  items[1].name = "due";
  test_managed_context.insertAt({ id: 4, name: "xx", score: 4 }, 1);
  test_managed_context.delete(items[0]);
  test_managed_context.prepend({ id: 0, name: "zz", score: 0 });

  items = test_managed_context.list();

  console.log(items);

  test_managed_context.rollback();

  items = test_managed_context.list();

  console.log(items);

  items[1].name = "due";
  test_managed_context.insertAt({ id: 4, name: "xx", score: 4 }, 1);
  test_managed_context.delete(items[0]);
  test_managed_context.prepend({ id: 0, name: "zz", score: 0 });

  test_managed_context.commit();

  items = test_managed_context.list();

  console.log(items);
}
