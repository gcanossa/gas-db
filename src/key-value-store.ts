import {
  ColumnDef,
  ContextRef,
  count,
  deleteAt,
  insertAt,
  read,
  updateAt,
} from "./sheets-orm";

export type KVStoreValue = string | number | Date | boolean | object;

export type KVStore = {
  clear(): void;
  delete(key: string): void;
  get(key: string): KVStoreValue | undefined;
  has(key: string): boolean;
  set(key: string, value: KVStoreValue): void;
  entries(): { [key: string]: KVStoreValue };
};

export const createPropertiesStore = (
  properties: GoogleAppsScript.Properties.Properties
): KVStore => {
  const store = {
    clear(): void {
      properties.deleteAllProperties();
    },
    delete(key: string): void {
      properties.deleteProperty(key);
    },
    get(key: string): KVStoreValue | undefined {
      const el = properties.getProperty(key);
      return !el ? undefined : JSON.parse(el);
    },
    has(key: string): boolean {
      return properties.getKeys().includes(key);
    },
    set(key: string, value: KVStoreValue): void {
      properties.setProperty(key, JSON.stringify(value));
    },
    entries(): { [key: string]: KVStoreValue } {
      const entries = properties.getProperties();
      return Object.keys(entries).reduce((result, key) => {
        result[key] = JSON.parse(entries[key]);
        return result;
      }, {} as { [key: string]: KVStoreValue });
    },
  };

  return store;
};

export const createSpreadsheetStore = (
  ctx: ContextRef<{ key: ColumnDef<string>; value: ColumnDef<string> }>
): KVStore => {
  const store = {
    clear(): void {
      deleteAt(ctx, 0, count(ctx));
    },
    delete(key: string): void {
      const items = read(ctx);
      const idx = items.findIndex((p) => p.key === key);
      if (idx >= 0) deleteAt(ctx, idx);
    },
    get(key: string): KVStoreValue | undefined {
      const items = read(ctx);
      const el = items.find((p) => p.key === key);
      return !el ? undefined : JSON.parse(el.value);
    },
    has(key: string): boolean {
      const items = read(ctx);
      const idx = items.findIndex((p) => p.key === key);
      return idx >= 0;
    },
    set(key: string, value: KVStoreValue): void {
      const items = read(ctx);
      const idx = items.findIndex((p) => p.key === key);
      if (idx >= 0) updateAt(ctx, { key, value: JSON.stringify(value) }, idx);
      else
        insertAt(
          ctx,
          { key, value: JSON.stringify(value) },
          items.length,
          true
        );
    },
    entries(): { [key: string]: KVStoreValue } {
      return read(ctx).reduce((obj, item) => {
        obj[item.key] = JSON.parse(item.value);
        return obj;
      }, {} as { [key: string]: KVStoreValue });
    },
  };

  return store;
};
