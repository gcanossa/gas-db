import {describe, test, expect} from 'vitest';
import { ColumnsMapping, entityFromRow, RangeHeaders, rowFromEntity } from './sheets-orm';

describe("Row mapping", ()=>{

  test("Row from entity", ()=>{
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

    const row = rowFromEntity<typeof entity>(entity, mapping, headers);

    expect(row).toEqual([3,'test',null,null,1234]);
  })
  
  test("Entity from row", ()=>{
    const mapping: ColumnsMapping<typeof entity> = {
      id: {type:'number', headerName:'Num'},
      name: {type: 'string', colIndex: 1},
      score: {type: 'number', headerName: 'Rank'}
    };

    const headers: RangeHeaders = {
      Num:0,
      Rank:4
    };

    const entity:any = entityFromRow<any>([3,'test',null,null,1234], mapping, headers);

    expect(entity).toEqual({
      id: 3,
      name: 'test',
      score: 1234
    });
  })
});