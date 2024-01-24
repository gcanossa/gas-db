import { ContextRef } from "./context";
import { ColumnsMapping, PropOfTypeNames, Sequence } from "./schema";
import { Context, getObject } from "./utils";

function seqEntryName<T extends ColumnsMapping>(
  ctx: ContextRef<T>,
  key: PropOfTypeNames<T, Sequence>
): string {
  const pctx: Context<T> = getObject(ctx);
  return Utilities.base64Encode(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      `${pctx.spreadsheet.getId()}/${JSON.stringify(pctx.rangeDef)}/${String(
        key
      )}`
    )
  );
}

export function seqCurrent<T extends ColumnsMapping>(
  ctx: ContextRef<T>,
  key: PropOfTypeNames<T, Sequence>
): number | null {
  const pctx: Context<T> = getObject(ctx);
  const value = pctx.metadata.get(seqEntryName(ctx, key));
  return !value ? null : parseInt(value);
}

export function seqNext<T extends ColumnsMapping>(
  ctx: ContextRef<T>,
  key: PropOfTypeNames<T, Sequence>
): number {
  const pctx: Context<T> = getObject(ctx);
  const entryName = seqEntryName(ctx, key);
  const value = pctx.metadata.get(entryName);
  const nextValue = !value ? 1 : parseInt(value) + 1;

  pctx.metadata.set(entryName, `${nextValue}`);
  return nextValue;
}

export function seqReset<T extends ColumnsMapping>(
  ctx: ContextRef<T>,
  key: PropOfTypeNames<T, Sequence>,
  value?: number
): void {
  const pctx: Context<T> = getObject(ctx);
  pctx.metadata.set(seqEntryName(ctx, key), `${value ?? 0}`);
}
