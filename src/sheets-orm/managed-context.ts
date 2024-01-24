import {
  ContextRef,
  count,
  deleteAt,
  insertAt,
  read,
  updateAt,
} from "./context";
import { NewRowObject, RowObject } from "./core";
import { ColumnsMapping } from "./schema";
import { createObjectRef, getObject, trimIndex } from "./utils";

type ManagedContext<T extends ColumnsMapping> = {
  ctx: ContextRef<T>;
  store: Entity<T>[];
  operationsLog: ManagedContextOperation<T>[];
};

export type ManagedContextRef<T extends ColumnsMapping> = {
  __brand: "ManagedContextRef<T>";
};

type Entity<T extends ColumnsMapping> = {
  entity: RowObject<T>;
  isDirty: boolean;
  invalid?: boolean;
  snapshot(): RowObject<T>;
  reset(): void;
  update(): void;
};

type ManagedContextOperation<T extends ColumnsMapping> = {
  entity: Entity<T>;
  type: "add" | "del";
  index: number;
};

export function createEntity<T extends ColumnsMapping>(
  item: RowObject<T>
): Entity<T> {
  let curr = { ...item };
  let next = null;

  const entry: Entity<T> = {
    entity: new Proxy(item, {
      get(target, p: string, receiver) {
        if (entry.invalid)
          throw new Error(
            "The current object has lost reference to its managed context."
          );
        return (next ?? curr)[p];
      },
      set(target, p: string, newValue, receiver) {
        if (entry.invalid)
          throw new Error(
            "The current object has lost reference to its managed context."
          );
        if (!next) next = { ...curr };
        next[p] = newValue;
        entry.isDirty = true;
        return next[p];
      },
    }),
    isDirty: false,
    snapshot() {
      return { ...curr, ...(next ?? {}) };
    },
    reset() {
      next = null;
      entry.isDirty = false;
      entry.invalid = false;
    },
    update() {
      curr = entry.snapshot();
      entry.reset();
    },
  };

  return entry;
}

export function createManagedContext<T extends ColumnsMapping>(
  ctx: ContextRef<T>
): ManagedContextRef<T> {
  return createObjectRef({
    ctx: ctx,
    store: [],
    operationsLog: [],
  });
}

export function add<T extends ColumnsMapping>(
  ctx: ManagedContextRef<T>,
  item: NewRowObject<T>,
  index?: number
): RowObject<T> {
  const pctx: ManagedContext<T> = getObject(ctx);
  if (pctx.store.length == 0) refresh(ctx);

  const entity = createEntity(item as any as RowObject<T>);
  const idx =
    index === undefined
      ? pctx.store.length
      : trimIndex(index, pctx.store.length);
  pctx.store.splice(idx, 0, entity);
  pctx.operationsLog.push({ entity: entity, type: "add", index: idx });

  return entity.entity as RowObject<T>;
}

export function remove<T extends ColumnsMapping>(
  ctx: ManagedContextRef<T>,
  item: RowObject<T>
): void {
  const pctx: ManagedContext<T> = getObject(ctx);
  const idx = pctx.store.findIndex((p) => p.entity === item);
  if (idx < 0) return;

  const entity = pctx.store.splice(idx, 1);
  entity[0].invalid = true;
  pctx.operationsLog.push({ entity: entity[0], type: "del", index: idx });
}

export function list<T extends ColumnsMapping>(
  ctx: ManagedContextRef<T>
): RowObject<T>[] {
  const pctx: ManagedContext<T> = getObject(ctx);
  if (pctx.store.length == 0) refresh(ctx);

  return pctx.store.map((p) => p.entity as RowObject<T>);
}

export function refresh<T extends ColumnsMapping>(
  ctx: ManagedContextRef<T>
): void {
  const pctx: ManagedContext<T> = getObject(ctx);
  pctx.store.forEach((p) => (p.invalid = true));
  pctx.store = read(pctx.ctx).map((p) => createEntity(p));
}

export function rollback<T extends ColumnsMapping>(ctx: ManagedContextRef<T>) {
  const pctx: ManagedContext<T> = getObject(ctx);
  let op: ManagedContextOperation<T>;
  while ((op = pctx.operationsLog.pop())) {
    if (op.type == "add") {
      pctx.store.splice(op.index, 1);
      op.entity.invalid = true;
    } else if (op.type == "del") {
      pctx.store.splice(op.index, 0, op.entity);
      op.entity.invalid = false;
    }
  }

  pctx.store.forEach((p) => p.reset());
}
export function commit<T extends ColumnsMapping>(ctx: ManagedContextRef<T>) {
  const pctx: ManagedContext<T> = getObject(ctx);
  let op: ManagedContextOperation<T>;
  while ((op = pctx.operationsLog.shift())) {
    if (op.type == "add") {
      insertAt(
        pctx.ctx,
        op.entity.snapshot() as any,
        op.index == count(pctx.ctx) ? op.index - 1 : op.index,
        op.index == count(pctx.ctx)
      );
    } else if (op.type == "del") {
      deleteAt(pctx.ctx, op.index);
    }
  }

  pctx.store.forEach((p, i) => {
    updateAt(pctx.ctx, p.snapshot() as any, i);
    p.update();
  });
}

export type ManagedContextGroup = {
  commit(): void;
  rollback(): void;
  addContext(ctx: ManagedContextRef<any>): void;
  removeContext(ctx: ManagedContextRef<any>): void;
};

export function createManagedContextGroup(
  ...params: ManagedContextRef<any>[]
): ManagedContextGroup {
  const group = [...params];
  return {
    commit() {
      group.forEach((ctx) => commit(ctx));
    },
    rollback() {
      group.reduceRight((ctx) => {
        rollback(ctx);
        return null;
      }, null);
    },
    addContext(ctx: ManagedContextRef<any>) {
      if (!ctx) group.push(ctx);
    },
    removeContext(ctx: ManagedContextRef<any>) {
      const idx = group.indexOf(ctx);
      if (idx >= 0) group.splice(idx, 1);
    },
  };
}
