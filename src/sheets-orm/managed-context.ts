import { Context, count, deleteAt, insertAt, read, updateAt } from "./context";
import { NewRowObject, RowObject } from "./core";
import { ColumnValueType, ColumnsMapping } from "./schema";
import { trimIndex } from "./utils";

export type ManagedContext<T extends ColumnsMapping> = {
  ctx: Context<T>;
  store: Entity<T>[];
  operationsLog: ManagedContextOperation<T>[];
};

export type Entity<T extends ColumnsMapping> = {
  entity: RowObject<T>;
  isDirty: boolean;
  invalid?: boolean;
  snapshot(): RowObject<T>;
  reset(): void;
  update(): void;
};

export type ManagedContextOperation<T extends ColumnsMapping> = {
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
  ctx: Context<T>
): ManagedContext<T> {
  return {
    ctx: ctx,
    store: [],
    operationsLog: [],
  };
}

export function add<T extends ColumnsMapping>(
  ctx: ManagedContext<T>,
  item: NewRowObject<T>,
  index?: number
): RowObject<T> {
  if (ctx.store.length == 0) refresh(ctx);

  const entity = createEntity(item as any as RowObject<T>);
  const idx =
    index === undefined ? ctx.store.length : trimIndex(index, ctx.store.length);
  ctx.store.splice(idx, 0, entity);
  ctx.operationsLog.push({ entity: entity, type: "add", index: idx });

  return entity.entity as RowObject<T>;
}

export function remove<T extends ColumnsMapping>(
  ctx: ManagedContext<T>,
  item: RowObject<T>
): void {
  const idx = ctx.store.findIndex((p) => p.entity === item);
  if (idx < 0) return;

  const entity = ctx.store.splice(idx, 1);
  entity[0].invalid = true;
  ctx.operationsLog.push({ entity: entity[0], type: "del", index: idx });
}

export function list<T extends ColumnsMapping>(
  ctx: ManagedContext<T>
): RowObject<T>[] {
  if (ctx.store.length == 0) refresh(ctx);

  return ctx.store.map((p) => p.entity as RowObject<T>);
}

export function refresh<T extends ColumnsMapping>(
  ctx: ManagedContext<T>
): void {
  ctx.store.forEach((p) => (p.invalid = true));
  ctx.store = read(ctx.ctx).map((p) => createEntity(p));
}

export function rollback<T extends ColumnsMapping>(ctx: ManagedContext<T>) {
  let op: ManagedContextOperation<T>;
  while ((op = ctx.operationsLog.pop())) {
    if (op.type == "add") {
      ctx.store.splice(op.index, 1);
      op.entity.invalid = true;
    } else if (op.type == "del") {
      ctx.store.splice(op.index, 0, op.entity);
      op.entity.invalid = false;
    }
  }

  ctx.store.forEach((p) => p.reset());
}
export function commit<T extends ColumnsMapping>(ctx: ManagedContext<T>) {
  let op: ManagedContextOperation<T>;
  while ((op = ctx.operationsLog.shift())) {
    if (op.type == "add") {
      insertAt(
        ctx.ctx,
        op.entity.snapshot() as any,
        op.index == count(ctx.ctx) ? op.index - 1 : op.index,
        op.index == count(ctx.ctx)
      );
    } else if (op.type == "del") {
      deleteAt(ctx.ctx, op.index);
    }
  }

  ctx.store.forEach((p, i) => {
    updateAt(ctx.ctx, p.snapshot() as any, i);
    p.update();
  });
}
