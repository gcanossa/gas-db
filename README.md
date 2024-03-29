# DEPRECATED

THe package has been refactored and organized under the organization [_@gasstack_](https://www.npmjs.com/search?q=%40gasstack).

In particular, for the functionalities here implemented:

- [@gasstack/db](https://www.npmjs.com/package/@gasstack/db)
- [@gasstack/kv](https://www.npmjs.com/package/@gasstack/kv)
- [@gasstack/fs](https://www.npmjs.com/package/@gasstack/fs)

# @gcanossa/gas-db

Google Apps Script Database microframework

## Installation

In order to install the package simply execute the command:

```
npm i @gcanossa/gas-db
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
  entries(): { [key: string]: KVStoreValue };
};
```

Values are stored and retrieved using JSON serialization (**JSON.stringify** and **JSON.parse**)

In order to create a store using a **Properties** store:

```ts
const store = createPropertiesStore(UserProperties);

const dstore = createPropertiesStore(ScriptProperties);

const value = store.get("key");

dstore.set("key", { name: "test", age: 18 });
```

In order to use a **Spreadsheet range** as backing storage:

```ts
//details below on what 'createContext' does
const tableContext = createContext<{ key: string; value: string }>(
  spreadsheet,
  range,
  mapping
);
const store = createSpreadsheetStore(tableContext);
```

### Relational stores

It is possible to create an instance of a Relational store table controller calling a builder function.

```ts
const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

const mapping = {
  id: numberCol("ID"),
  score: numberCol("Name"),
  name: dateCol(2),
};

const table = createContext<typeof mapping>(
  ss,
  { sheetName: "People" },
  mapping
);
```

The created controller satisfies the following specification:

It is possibile to specify a range in multiple ways:

- Using an entire spreadsheet sheet, with the first row the columns headers

```ts
{
  sheetName: "Sheet1";
}
```

- Using a named range made of a single row which contains the columns headers

```ts
{
  rangeName: "People";
}
```

- Using an a1Notation range made of a single row which contains the columns headers

```ts
{
  a1NotationRange: "Sheet2!N5:P5";
}
```

The mapping argument specifies how to couple object properties with the range columns:

- With a header name to search in the header line

```ts
{
    ...
    score: numberCol('Name'),
    ...
}
```

- With a column index

```ts
{
    ...
    name: dateCol(2)
    ...
}
```

It is possibile to combine **named mappings** and **indexed mappings** to map non contiguous columns to a given entity type.
