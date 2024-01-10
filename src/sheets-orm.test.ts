import { describe, test, expect } from "vitest";
import {
  ColumnsMapping,
  entityFromRow,
  numberCol,
  RangeHeaders,
  rowFromEntity,
  RowObject,
  stringCol,
} from "./sheets-orm";

describe("Row mapping", () => {
  test("Row from entity", () => {
    const entity = {
      id: 3,
      name: "test",
      score: 1234,
    };

    const mapping: ColumnsMapping = {
      id: numberCol("Num"),
      name: stringCol(1),
      score: numberCol("Rank"),
    };

    const headers: RangeHeaders = {
      Num: 0,
      Rank: 4,
    };

    const row = rowFromEntity<typeof mapping>(entity, mapping, headers);

    expect(row).toEqual([3, "test", null, null, 1234]);
  });

  test("Entity from row", () => {
    const mapping = {
      id: numberCol("Num"),
      name: stringCol(1),
      score: numberCol("Rank"),
    };

    const headers: RangeHeaders = {
      Num: 0,
      Rank: 4,
    };

    const entity = entityFromRow<typeof mapping>(
      [3, "test", null, null, 1234],
      mapping,
      headers
    );

    expect(entity).toEqual({
      id: 3,
      name: "test",
      score: 1234,
    });
  });
});
