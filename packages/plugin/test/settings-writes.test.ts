import test from 'node:test'
import assert from 'node:assert/strict'
import { fieldWrite, poolWriteOps } from '../src/client/settings-writes.ts'

test('saving an inherited value removes the old user override', () => {
  const edit = fieldWrite('enabled', false, true, false)
  assert.ok(edit)
  assert.deepEqual(poolWriteOps([edit]), [{ op: 'unset', path: ['ipPool', 'enabled'] }])
  assert.equal(fieldWrite('enabled', false, false, true), undefined)
})

test('subscription edits migrate the old URL spelling atomically', () => {
  const edit = fieldWrite('subscription', { urls: [], refreshMs: 60_000 }, { urls: ['https://example.test/sub'] }, undefined)
  assert.ok(edit)
  assert.deepEqual(poolWriteOps([edit]), [
    { op: 'set', path: ['ipPool', 'subscription'], value: { urls: [], refreshMs: 60_000 } },
    { op: 'unset', path: ['ipPool', 'subscriptions'] },
  ])
})

test('an ordinary pool edit keeps unrelated configuration outside its paths', () => {
  const edit = fieldWrite('manual', ['http://127.0.0.1:7897'], [], [])
  assert.ok(edit)
  assert.deepEqual(poolWriteOps([edit]), [{ op: 'set', path: ['ipPool', 'manual'], value: ['http://127.0.0.1:7897'] }])
})

test('a models-node edit addresses the models node, not ipPool', () => {
  // Regression guard: poolWriteOps used to hardcode the `ipPool` prefix, which
  // would land the filter on a path the host rejects (freeOnly is not an
  // ipPool field) and take the whole save batch down with it.
  const edit = fieldWrite('freeOnly', false, true, true)
  assert.ok(edit)
  assert.deepEqual(poolWriteOps([edit], 'models'), [{ op: 'set', path: ['models', 'freeOnly'], value: false }])
})

test('the legacy subscriptions alias migration stays pool-only', () => {
  // The alias lives under ipPool. A models-node write must never drag an
  // extra unset along, even for a field named `subscription`.
  const edit = fieldWrite('subscription', { urls: [] }, undefined, undefined)
  assert.ok(edit)
  assert.deepEqual(poolWriteOps([edit], 'models'), [{ op: 'set', path: ['models', 'subscription'], value: { urls: [] } }])
})
