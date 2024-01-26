import { describe, test, expect } from "vitest";
import {
  ColumnsMapping,
  entityFromRow,
  linkCol,
  numberCol,
  RangeHeaders,
  rowFromEntity,
  RowObject,
  serial,
  stringCol,
} from "./sheets-orm";

describe("Row mapping", () => {
  test("Row from entity", () => {
    const mapping: ColumnsMapping = {
      id: numberCol("Num"),
      name: stringCol(1),
      score: numberCol("Rank"),
      lnk: linkCol(3),
      serial: serial(numberCol(5)),
    };

    const headers: RangeHeaders = {
      Num: 0,
      Rank: 4,
    };

    const entity = {
      id: 3,
      name: "test",
      score: 1234,
      lnk: { url: "http://ciao", label: "ciao" },
      serial: 1,
    } satisfies RowObject<typeof mapping>;

    const row = rowFromEntity<typeof mapping>(entity, mapping, headers);

    expect(row).toEqual([
      3,
      "test",
      null,
      `=HYPERLINK("http://ciao","ciao")`,
      1234,
      1,
    ]);
  });

  test("Entity from row", () => {
    const mapping: ColumnsMapping = {
      id: numberCol("Num"),
      name: stringCol(1),
      score: numberCol("Rank"),
      lnk: linkCol(3),
      serial: serial(numberCol(5)),
    };

    const headers: RangeHeaders = {
      Num: 0,
      Rank: 4,
    };

    const entity = entityFromRow<typeof mapping>(
      [3, "test", null, `=HYPERLINK("http://ciao", "ciao")`, 1234, 1],
      mapping,
      headers
    );

    expect(entity).toEqual({
      id: 3,
      name: "test",
      score: 1234,
      lnk: { url: "http://ciao", label: "ciao" },
      serial: 1,
    });
  });
});
