import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { readPersistentState, writePersistentState, mutatePersistentState } from '../src/storage.js';

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ary-persistent-state-'));
const filePath = path.join(tempDir, 'state.json');
const collection = `file-state-test-${process.pid}-${Date.now()}`;
const initialState = { counter: 0, entries: [] };

try {
  await writePersistentState(collection, filePath, initialState);
  await Promise.all(Array.from({ length: 100 }, (_, index) =>
    mutatePersistentState(collection, filePath, initialState, state => {
      state.counter += 1;
      state.entries.push(index);
      return state.counter;
    })
  ));

  const state = await readPersistentState(collection, filePath, {});
  assert.equal(state.counter, 100, 'Concurrent file mutations should serialize without lost updates');
  assert.equal(state.entries.length, 100, 'All concurrent mutation entries should be retained');
  const leftovers = (await fs.readdir(tempDir)).filter(name => name.includes('.tmp.'));
  assert.deepEqual(leftovers, [], 'Atomic file writes should clean up temporary files');
  console.log('Persistent-state file integration passed: serialized concurrent mutations and atomic replacement.');
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}
