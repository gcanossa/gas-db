# @gcanossa/gas-db

Google Apps Script Database microframework

## Installation

In order to install the package simply execute the command:
```
npm i -D @gcanossa/gas-db
```

## Usage

The package offers the possibility to work in an agnostic way with both key-value stores and relational-like stores offered by the Google Apps Script environment.

### KV Stores

It is possible to create an instance of a KV store controller calling a builder function.
The created controller satisfies the following specification:
```ts
type KVStore = {
  clear(): void;
  delete(key: string): void;
  get(key: string): KVStoreValue | undefined;
  has(key: string): boolean;
  set(key: string, value: KVStoreValue): void;
  entries():{[key:string]:KVStoreValue}
}
```
Values are stored and retrieved using JSON serialization (**JSON.stringify** and **JSON.parse**)

In order to create a store using a **Properties** store:

```ts
const store = createPropertiesStore(UserProperties);

const dstore = createPropertiesStore(ScriptProperties);

const value = store.get("key");

dstore.set("key", {name:"test", age: 18});
```

In order to use a **Spreadsheet range** as backing storage:

```ts
//details below on what 'createTableContext' does
const tableContext = createTableContext<{ key:string, value: string }>(spreadsheet, range, mapping )
const store = createSpreadsheetStore(tableContext);
```

### Relational stores

It is possible to create an instance of a Relational store table controller calling a builder function.

```ts
const ss = SpreadsheetApp.openById(SPREADSHEET_ID);


const mapping: ColumnsMapping<typeof entity> = {
    id: {type:'number', headerName:'ID'},
    score: {type: 'number', headerName: 'Name'},
    name: {type: 'Date', colIndex: 2}
};

const table = createTableContext<{id: number, name: string, birthdate: Date}>(ss, {sheetName:"People"}, mapping);
```

The created controller satisfies the following specification:
```ts
type RowObject = { [ key: string]: CellValueType }

type TableReadContext<T extends RowObject> = {
  list(): T[];
  where(predicate: (p:T) => boolean): {index:number, item:T}[];
  find(predicate: (p:T) => boolean): T | null;
  findIndex(predicate: (p:T) => boolean): number;
}

type TableWriteContext<T extends RowObject> = {
  append(item: T): void;
  prepend(item: T): void;
  insertAt(item: T, index:number): void;
  deleteAt(index: number): void;
  deleteAll(): void;
  updateAt(item: Partial<T>, index:number): void;
}
```

It is possibile to specify a range in multiple ways:
* Using an entire spreadsheet sheet, with the first row the columns headers
```ts
{ sheetName: 'Sheet1' }
```
* Using a named range made of a single row which contains the columns headers
```ts
{ rangeName: 'People' }
```
* Using an a1Notation range made of a single row which contains the columns headers
```ts
{ a1NotationRange: 'Sheet2!N5:P5' }
```

The mapping argument specifies how to couple object properties with the range columns:
* With a header name to search in the header line
```ts
{
    ...
    score: {type: 'number', headerName: 'Name'},
    ...
}
```
* With a column index
```ts
{
    ...
    name: {type: 'Date', colIndex: 2}
    ...
}
```

It is possibile to combine **named mappings** and **indexed mappings** to map non contiguous columns to a given entity type.