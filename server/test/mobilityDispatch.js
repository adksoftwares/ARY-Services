import assert from 'node:assert/strict';
import { cleanSriLankaCoordinates, isDriverPresenceFresh, rankJobsForDriver } from '../src/mobilityDispatch.js';

const now = Date.parse('2026-11-02T12:00:00.000Z');
assert.deepEqual(cleanSriLankaCoordinates(6.9271,79.8612),{lat:6.9271,lng:79.8612});
assert.equal(cleanSriLankaCoordinates(40.7128,-74.006),null);
assert.equal(cleanSriLankaCoordinates('not-a-latitude',79.8),null);

const fresh={online:true,lat:6.9271,lng:79.8612,updatedAt:new Date(now-10000).toISOString()};
assert.equal(isDriverPresenceFresh(fresh,now),true);
assert.equal(isDriverPresenceFresh({...fresh,updatedAt:new Date(now-120000).toISOString()},now),false);
assert.equal(isDriverPresenceFresh({...fresh,online:false},now),false);

const jobs=[
 {id:'far',serviceType:'ride',pickupLat:6.90,pickupLng:79.90,status:'requested'},
 {id:'near',serviceType:'ride',pickupLat:6.928,pickupLng:79.862,status:'requested'},
 {id:'food',serviceType:'food_delivery',destinationLat:6.9272,destinationLng:79.8613,status:'requested'}
];
const ranked=rankJobsForDriver(jobs,fresh,now);
assert.equal(ranked[0].id,'food');
assert.equal(ranked[1].id,'near');
assert(ranked[0].distanceKm<1);
assert(ranked[0].etaMinutes>=10);
assert.equal(rankJobsForDriver(jobs,{...fresh,updatedAt:new Date(now-120000).toISOString()},now)[0].distanceKm,null);
console.log('Mobility dispatch and GPS freshness tests passed.');
