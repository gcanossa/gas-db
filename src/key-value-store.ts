import { TableContext } from "./sheets-orm";

export interface KVStore {
  clear(): void;
  delete(key: string): void;
  get(key: string): string | undefined;
  has(key: string): boolean;
  set(key: string, value: string): void;
  entries():{[key:string]:string}
}

export const createPropertiesStore = (properties:GoogleAppsScript.Properties.Properties): KVStore => {
  
  const store = {
    clear(): void {
      properties.deleteAllProperties();
    },
    delete(key: string): void {
      properties.deleteProperty(key);
    },
    get(key: string): string | undefined {
      const el = properties.getProperty(key);
      return !!el ? el : undefined;
    },
    has(key: string): boolean {
      return properties.getKeys().includes(key);
    },
    set(key: string, value: any): void {
      properties.setProperty(key, value);
    },
    entries(): { [key: string]: any; } {
      const entries = properties.getProperties();
      return entries;
    }
  }

  return store;
}

export const createSpreadsheetStore = (ctx:TableContext<{key:string, value: string}>): KVStore => {
  
  const store = {
    clear(): void {
      ctx.deleteAll();
    },
    delete(key: string): void {
      ctx.deleteAt(ctx.findIndex(p => p.key === key));
    },
    get(key: string): string | undefined {
      const el = ctx.find(p => p.key === key);
      return !!el ? el.value : undefined;
    },
    has(key: string): boolean {
      return ctx.findIndex(p => p.key === key) >= 0;
    },
    set(key: string, value: string): void {
      const idx = ctx.findIndex(p => p.key === key);
      if(idx >= 0)
        ctx.updateAt({key, value}, idx);
      else
        ctx.append({key, value});
    },
    entries(): { [key: string]: string; } {
      return ctx.list().reduce((obj, item)=>{
        obj[item.key]=item.value;
        return obj;
      },{} as any);
    }
  }

  return store;
}