import assert from 'node:assert/strict';
import { findLiveUserForToken } from '../src/sessionIdentity.js';

const original = { id: 'user-original', phone: '+94770000000', email: 'old@example.com' };
const replacement = { id: 'user-new', phone: '+94770000000', email: 'old@example.com' };

assert.equal(
  findLiveUserForToken([original], { id: 'user-original', phone: original.phone }),
  original,
  'A valid token must resolve by immutable account ID'
);
assert.equal(
  findLiveUserForToken([replacement], { id: 'user-original', phone: replacement.phone, email: replacement.email }),
  null,
  'A recycled phone number or email must not rebind an old token'
);
assert.equal(findLiveUserForToken([], { id: 'user-original' }), null);
assert.equal(findLiveUserForToken([original], { phone: original.phone }), null);
console.log('Session identity tests passed.');
