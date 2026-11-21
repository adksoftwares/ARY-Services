import assert from 'node:assert/strict';
import { summarizeMarketplaceOperations } from '../src/marketplaceOperations.js';

const now = Date.parse('2026-11-22T12:00:00.000Z');
const report = summarizeMarketplaceOperations([
  {id:'a',status:'requested',createdAt:'2026-11-22T11:00:00.000Z'},
  {id:'b',status:'requested',createdAt:'2026-11-22T11:45:00.000Z'},
  {id:'c',status:'completed'},
  {id:'d',status:'cancelled',cancelledBy:'provider'},
  {id:'e',status:'cancelled',cancelledBy:'unexpected-value'},
  {id:'f',status:'accepted'}
], now);
assert.equal(report.totalBookings, 6);
assert.equal(report.requestedBookings, 2);
assert.equal(report.pendingOver30Minutes, 1);
assert.equal(report.oldestPendingMinutes, 60);
assert.equal(report.completedBookings, 1);
assert.equal(report.cancelledBookings, 2);
assert.equal(report.completionRatePercent, 33.3);
assert.deepEqual(report.cancellationsByActor, {provider:1,unknown:1});
assert.equal(summarizeMarketplaceOperations([]).completionRatePercent, 0);
console.log('marketplaceOperations regression checks passed');
