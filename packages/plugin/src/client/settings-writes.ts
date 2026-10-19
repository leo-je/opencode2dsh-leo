export interface FieldWrite { field: string; op: 'set' | 'unset'; value?: unknown }

/** Reverting an override to its inherited value must remove the override. */
export function fieldWrite(field: string, next: unknown, current: unknown, base: unknown): FieldWrite | undefined {
  if (JSON.stringify(next) === JSON.stringify(current)) return undefined
  if (JSON.stringify(next) === JSON.stringify(base)) return { field, op: 'unset' }
  return { field, op: 'set', value: next }
}

/**
 * Render field writes as host path ops under one volatile node.
 *
 * The served form is the plugin's whole volatile set — `{ ipPool, credential,
 * models }` — so every write path is `<node>.<field>`. `ipPool` is the default
 * because it is what all but the model filter edit; the filter passes
 * `'models'`, and a batch that spans both nodes must carry both prefixes (the
 * host validates each path against the declared volatile nodes and rejects the
 * batch whole).
 *
 * The legacy `subscriptions` alias migration is pool-specific, hence the guard.
 */
export function poolWriteOps(writes: FieldWrite[], node = 'ipPool') {
  return writes.flatMap((write) => {
    const edit = write.op === 'unset'
      ? { op: 'unset' as const, path: [node, write.field] }
      : { op: 'set' as const, path: [node, write.field], value: write.value }
    return node === 'ipPool' && write.field === 'subscription'
      ? [edit, { op: 'unset' as const, path: [node, 'subscriptions'] }]
      : [edit]
  })
}
