import { TableContext } from "./sheets-orm";

export type KVStoreValue = 
 | string 
 | number
 | Date
 | boolean
 | object;

export type KVStore = {
  clear(): void;
  delete(key: string): void;
  get(key: string): KVStoreValue | undefined;
  has(key: string): boolean;
  set(key: string, value: KVStoreValue): void;
  entries():{[key:string]:KVStoreValue}
}

export const createPropertiesStore = (properties:GoogleAppsScript.Properties.Properties): KVStore => {
  
  const store = {
    clear(): void {
      properties.deleteAllProperties();
    },
    delete(key: string): void {
      properties.deleteProperty(key);
    },
    get(key: string): KVStoreValue | undefined {
      const el = properties.getProperty(key);
      return !el ? undefined
        : JSON.parse(el);
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
    }
  }

  return store;
}

export const createSpreadsheetStore = (ctx:TableContext<{ key:string, value: string }>): KVStore => {
  
  const store = {
    clear(): void {
      ctx.deleteAll();
    },
    delete(key: string): void {
      ctx.deleteAt(ctx.findIndex(p => p.key === key));
    },
    get(key: string): KVStoreValue | undefined {
      const el = ctx.find(p => p.key === key);
      return !el ? undefined : JSON.parse(el.value);
    },
    has(key: string): boolean {
      return ctx.findIndex(p => p.key === key) >= 0;
    },
    set(key: string, value: KVStoreValue): void {
      const idx = ctx.findIndex(p => p.key === key);
      if(idx >= 0)
        ctx.updateAt({key, value: JSON.stringify(value)}, idx);
      else
        ctx.append({key, value: JSON.stringify(value)});
    },
    entries(): { [key: string]: KVStoreValue } {
      return ctx.list().reduce((obj, item)=>{
        obj[item.key] = JSON.parse(item.value);
        return obj;
      }, {} as { [key: string]: KVStoreValue });
    }
  }

  return store;
}