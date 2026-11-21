import assert from 'node:assert/strict';
import { cleanSriLankaCoordinates, isDriverPresenceFresh, rankJobsForDriver, dispatchFairnessScore, releasePriorityBoost, isDriverEligibleForRequeuedJob, summarizeDriverReliability, buildAdminDispatchSnapshot } from '../src/mobilityDispatch.js';

const now = Date.parse('2026-11-02T12:00:00.000Z');
assert.deepEqual(cleanSriLankaCoordinates(6.9271,79.8612),{lat:6.9271,lng:79.8612});
assert.equal(cleanSriLankaCoordinates(40.7128,-74.006),null);
assert.equal(cleanSriLankaCoordinates('not-a-latitude',79.8),null);

const fresh={online:true,lat:6.9271,lng:79.8612,updatedAt:new Date(now-10000).toISOString()};
assert.equal(isDriverPresenceFresh(fresh,now),true);
assert.equal(isDriverPresenceFresh({...fresh,updatedAt:new Date(now-120000).toISOString()},now),false);
assert.equal(isDriverPresenceFresh({...fresh,online:false},now),false);

const jobs=[
 {id:'far',serviceType:'ride',pickupLat:6.90,pickupLng:79.90,status:'requested',createdAt:new Date(now-60000).toISOString()},
 {id:'near',serviceType:'ride',pickupLat:6.928,pickupLng:79.862,status:'requested',createdAt:new Date(now-60000).toISOString()},
 {id:'food',serviceType:'food_delivery',destinationLat:6.9272,destinationLng:79.8613,status:'requested',createdAt:new Date(now-60000).toISOString()}
];
const ranked=rankJobsForDriver(jobs,fresh,now);
assert.equal(ranked[0].id,'food');
assert.equal(ranked[1].id,'near');
assert.equal(ranked[0].fairnessScore,ranked[0].distanceKm-0.1);
assert.equal(dispatchFairnessScore(2,new Date(now-600000).toISOString(),now),1);
assert.equal(dispatchFairnessScore(2,new Date(now-900000).toISOString(),now),-0.5);
assert(ranked[0].distanceKm<1);
assert(ranked[0].etaMinutes>=10);
assert.equal(rankJobsForDriver(jobs,{...fresh,updatedAt:new Date(now-120000).toISOString()},now)[0].distanceKm,null);
const fairnessOrder=rankJobsForDriver([
 {id:'new-close',serviceType:'ride',pickupLat:6.9272,pickupLng:79.8613,status:'requested',createdAt:new Date(now).toISOString()},
 {id:'older-far',serviceType:'ride',pickupLat:6.90,pickupLng:79.90,status:'requested',createdAt:new Date(now-6000000).toISOString()}
],fresh,now);
assert.equal(fairnessOrder[0].id,'older-far','Aging boost should help long-waiting jobs avoid starvation');
console.log('Mobility dispatch, GPS freshness, and fairness ranking tests passed.');

const snapshot=buildAdminDispatchSnapshot(
 [{id:'active',serviceType:'ride',status:'accepted',customerName:'Customer',driverId:'driver-1',driverName:'Driver',pickupAddress:'A',destinationAddress:'B'},
  {id:'done',serviceType:'ride',status:'completed',customerName:'Customer'}],
 [{userId:'driver-1',driverName:'Driver',driverType:'ride',status:'approved'},
  {userId:'driver-2',driverName:'Unapproved',driverType:'ride',status:'pending'}],
 {'driver-1':fresh,'driver-2':fresh,'driver-3':{...fresh,updatedAt:new Date(now-120000).toISOString()}},now
);
assert.equal(snapshot.drivers.length,1);
assert.equal(snapshot.activeJobs.length,1);
assert.equal(snapshot.summary.onlineDrivers,1);
assert.equal(snapshot.summary.assignedJobs,1);
assert.equal('nicNumber' in snapshot.drivers[0],false);
assert.equal('customerId' in snapshot.activeJobs[0],false);

const reliability=summarizeDriverReliability([
 {id:'finished',driverId:'driver-a',status:'completed'},
 {id:'requeued',driverId:null,status:'requested',driverReleaseHistory:[
   {driverId:'driver-a',reason:'vehicle issue'},
   {driverId:'driver-b',reason:'personal'}
 ]},
 {id:'delivered',driverId:'driver-a',status:'delivered',driverReleaseHistory:[]}
], 'driver-a');
assert.deepEqual(reliability,{completed:2,prePickupReleases:1,engagements:3,reliabilityRate:67});
assert.equal(summarizeDriverReliability([], 'inactive').reliabilityRate,null);

assert.equal(releasePriorityBoost({driverReleaseCount:1}),0.5);
assert.equal(releasePriorityBoost({driverReleaseCount:10}),2,"release boost is capped");
assert.equal(isDriverEligibleForRequeuedJob({driverReleaseHistory:[{driverId:"driver-a"}]},"driver-a"),false);
assert.equal(isDriverEligibleForRequeuedJob({driverReleaseHistory:[{driverId:"driver-a"}]},"driver-b"),true);
const releasedJobsRank=rankJobsForDriver([
 {id:"fresh",serviceType:"ride",pickupLat:6.9272,pickupLng:79.8613,status:"requested",createdAt:new Date(now).toISOString()},
 {id:"released-twice",serviceType:"ride",pickupLat:6.9272,pickupLng:79.8613,status:"requested",createdAt:new Date(now).toISOString(),driverReleaseHistory:[{driverId:"x"},{driverId:"y"}]}
],fresh,now);
assert.equal(releasedJobsRank[0].id,"released-twice","released jobs gain capped urgency");
