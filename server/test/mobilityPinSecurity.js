import assert from 'node:assert/strict';
import { MOBILITY_PIN_TTL_MS, isMobilityPinExpired } from '../src/mobilityPinSecurity.js';

const now = Date.parse('2026-11-22T00:00:00Z');
const expiry = new Date(now + MOBILITY_PIN_TTL_MS).toISOString();
assert.equal(isMobilityPinExpired({ pinExpiresAt: expiry }, now), false);
assert.equal(isMobilityPinExpired({ pinExpiresAt: expiry }, now + MOBILITY_PIN_TTL_MS), true);
assert.equal(isMobilityPinExpired({ pinExpiresAt: 'invalid' }, now), true);
assert.equal(isMobilityPinExpired({}, now), true);
assert.equal(isMobilityPinExpired({ createdAt: new Date(now).toISOString() }, now + MOBILITY_PIN_TTL_MS - 1), false);
assert.equal(isMobilityPinExpired({ createdAt: new Date(now).toISOString() }, now + MOBILITY_PIN_TTL_MS), true);
assert.equal(isMobilityPinExpired(null, now), true);
console.log('✓ Mobility PIN expiry boundaries and legacy fallback passed');
