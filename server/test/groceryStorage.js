import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  mutatePersistentState,
  readPersistentState,
  writePersistentState
} from '../src/storage.js';

const collection = `grocery-test-${process.pid}-${crypto.randomUUID()}`;
const file = path.join(os.tmpdir(), `ary-grocery-${crypto.randomUUID()}.json`);
const emptyState = [];

try {
  await writePersistentState(collection, file, emptyState);

  await Promise.all(Array.from({ length: 30 }, (_, index) =>
    mutatePersistentState(collection, file, emptyState, (products) => {
      products.push({
        id: `product-${index}`,
        providerId: 'provider-test',
        sku: `SKU-${index}`,
        stock: index
      });
    })
  ));

  const products = await readPersistentState(collection, file, emptyState);
  assert.equal(products.length, 30, 'Concurrent inventory updates must not overwrite one another');
  assert.equal(new Set(products.map((product) => product.id)).size, 30, 'Every inventory item must remain unique');
  assert.equal(products.find((product) => product.id === 'product-29')?.stock, 29);

  console.log('Grocery persistence test passed: concurrent inventory mutations remain atomic.');
} finally {
  await fs.rm(file, { force: true });
}
