import assert from 'node:assert/strict';
import { summarizeProviderTrust } from '../src/providerTrust.js';

const bookings = [
 { id: 'b1', providerId: 'p1', status: 'completed' },
 { id: 'b2', providerId: 'p1', status: 'completed' },
 { id: 'b3', providerId: 'p1', status: 'cancelled', cancelledBy: 'p1' },
 { id: 'b4', providerId: 'p1', status: 'completed', lifecycleHistory: [{event:'provider_declined_rebroadcast',actorId:'p1'}]},
 { id: 'b5', providerId: 'p1', status: 'completed' },
 { id: 'b6', providerId: 'p1', status: 'completed' },
 { id: 'other', providerId: 'p2', status: 'completed' }
];
const reviews = [
 {bookingId:'b1',providerId:'p1',verifiedBooking:true,rating:5},
 {bookingId:'b2',providerId:'p1',verifiedBooking:true,rating:4},
 {bookingId:'b5',providerId:'p1',verifiedBooking:true,rating:4},
 {bookingId:'other',providerId:'p1',verifiedBooking:true,rating:1}
];
const result = summarizeProviderTrust('p1', bookings, reviews);
assert.equal(result.completedBookings, 5);
assert.equal(result.providerCancellations, 1);
assert.equal(result.providerDeclines, 1);
assert.equal(result.verifiedReviewCount, 3);
assert.equal(result.averageVerifiedRating, 4.33);
assert.equal(result.trustConfidence, 'medium');
assert.ok(result.trustScore < 87);
assert.deepEqual(result.riskSignals, []);
assert.equal(summarizeProviderTrust('p2', bookings, reviews).verifiedReviewCount, 0);
console.log('providerTrust regression checks passed');
