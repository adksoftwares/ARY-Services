import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPersistentState, mutatePersistentState } from './storage.js';
import { calculateDistanceKm, estimateEtaMinutes } from './geoService.js';

const dataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'driver-services.json');
const emptyDriverState = { applications: [], jobs: [], presence: {} };
async function mutateJobs(mutator) {
  return mutatePersistentState('driver-services', dataFile, emptyDriverState, mutator);
}
async function readJobs() {
  const state = await readPersistentState('driver-services', dataFile, emptyDriverState);
  return { applications: state.applications || [], jobs: state.jobs || [], presence: state.presence || {} };
}
const id=prefix=>prefix+'_'+crypto.randomUUID().replaceAll('-','').slice(0,12);
const types=['food_delivery','ride'];
const validCoordinates = (lat, lng) =>
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) &&
  Number(lat) >= 5.8 && Number(lat) <= 10.1 &&
  Number(lng) >= 79.0 && Number(lng) <= 82.2;
const cleanCoordinates = (lat, lng) => validCoordinates(lat, lng)
  ? { lat: Number(lat), lng: Number(lng) }
  : null;
const distanceToJob = (presence, job) => {
  const targetLat = job.serviceType === 'food_delivery' ? job.destinationLat : job.pickupLat;
  const targetLng = job.serviceType === 'food_delivery' ? job.destinationLng : job.pickupLng;
  if (!presence || !Number.isFinite(Number(targetLat)) || !Number.isFinite(Number(targetLng))) return null;
  return calculateDistanceKm(presence.lat, presence.lng, targetLat, targetLng);
};
export function registerDriverServiceRoutes(app,{requireAuth,requireAdmin,broadcastEvent,getBookings,getUsers}){
  app.post('/api/driver-applications',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Only registered Driver accounts can apply to driver networks.'});
    const requested=Array.isArray(req.body?.driverTypes)?req.body.driverTypes:[req.body?.driverType];
    const driverTypes=[...new Set(requested.map(String).filter(type=>types.includes(type)))];
    if(!driverTypes.length)return res.status(400).json({error:'Choose Ride, Food Delivery, or both.'});
    const applications=await mutateJobs(data=>{
      const submitted=[];
      for(const driverType of driverTypes){
        let existing=data.applications.find(a=>a.userId===req.user.id&&a.driverType===driverType&&['pending','approved'].includes(a.status));
        if(!existing){existing={id:id('drvapp'),userId:req.user.id,driverName:req.user.fullName,driverType,status:'pending',createdAt:new Date().toISOString()};data.applications.push(existing);}
        submitted.push(existing);
      }
      return submitted;
    });
    broadcastEvent?.('driver:application_created',{userId:req.user.id,applications});res.status(201).json({applications});
  });
  app.get('/api/admin/driver-applications',requireAdmin,async(_req,res)=>{const d=await readJobs();res.json({applications:d.applications});});
  app.patch('/api/admin/driver-applications/:id',requireAdmin,async(req,res)=>{
    const status=String(req.body?.status||'');
    if(!['approved','rejected'].includes(status))return res.status(400).json({error:'Status must be approved or rejected.'});
    const a=await mutateJobs(d=>{const item=d.applications.find(x=>x.id===req.params.id);if(!item)return null;item.status=status;item.reviewedAt=new Date().toISOString();item.reviewedBy=req.user.id;return item;});
    if(!a)return res.status(404).json({error:'Application not found.'});
    broadcastEvent?.('driver:application_reviewed',{userId:a.userId,application:a});res.json({application:a});
  });
  app.post('/api/food-deliveries',requireAuth,async(req,res)=>{
    const {orderReference,restaurantName,pickupAddress,dropoffAddress,notes=''}=req.body||{};
    if(!orderReference||!pickupAddress||!dropoffAddress)return res.status(400).json({error:'A valid food order reference, pickup and delivery addresses are required.'});
    const orders=await getBookings();const order=orders.find(b=>b.id===String(orderReference)&&b.customerId===req.user.id&&String(b.categorySlug||'').toLowerCase().includes('food'));
    if(!order)return res.status(404).json({error:'Food order not found for this customer. Place a food shop order first.'});
    if(!['accepted','preparing','ready'].includes(order.status))return res.status(409).json({error:'The restaurant must accept or prepare the food order before delivery can be requested.'});
    const users=await getUsers();const restaurant=users.find(u=>u.id===order.providerId);
    const destination=cleanCoordinates(req.body?.destinationLat,req.body?.destinationLng);
    const job={id:id('food'),serviceType:'food_delivery',customerId:req.user.id,customerName:req.user.fullName,orderReference:order.id,restaurantName:String(restaurantName||order.providerName||'Food Shop').slice(0,160),pickupAddress:String(pickupAddress||restaurant?.location||'').slice(0,500),destinationAddress:String(dropoffAddress).slice(0,500),destinationLat:destination?.lat??null,destinationLng:destination?.lng??null,notes:String(notes).slice(0,500),driverId:null,status:'requested',createdAt:new Date().toISOString()};
    await mutateJobs(d=>{d.jobs.unshift(job);});
    broadcastEvent?.('driver:job_created',{job});res.status(201).json({job});
  });
  app.post('/api/ride-trips',requireAuth,async(req,res)=>{
    const {pickupAddress,destinationAddress,passengerCount=1,notes=''}=req.body||{};
    const count=Number(passengerCount);
    if(!pickupAddress||!destinationAddress||!Number.isInteger(count)||count<1||count>6)return res.status(400).json({error:'Valid pickup, destination and passenger count (1-6) are required.'});
    const pickup=cleanCoordinates(req.body?.pickupLat,req.body?.pickupLng);
    const destination=cleanCoordinates(req.body?.destinationLat,req.body?.destinationLng);
    const job={id:id('ride'),serviceType:'ride',customerId:req.user.id,customerName:req.user.fullName,pickupAddress:String(pickupAddress).slice(0,500),destinationAddress:String(destinationAddress).slice(0,500),pickupLat:pickup?.lat??null,pickupLng:pickup?.lng??null,destinationLat:destination?.lat??null,destinationLng:destination?.lng??null,passengerCount:count,notes:String(notes).slice(0,500),driverId:null,status:'requested',createdAt:new Date().toISOString()};
    await mutateJobs(d=>{d.jobs.unshift(job);});
    broadcastEvent?.('driver:job_created',{job});res.status(201).json({job});
  });
  // Driver presence is opt-in and only available after the relevant network is approved.
  app.patch('/api/driver-presence',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    const online=req.body?.online===true;
    const lat=req.body?.lat, lng=req.body?.lng;
    if(online&&!cleanCoordinates(lat,lng))return res.status(400).json({error:'A valid Sri Lankan GPS location is required before going online.'});
    const result=await mutateJobs(d=>{
      const approved=d.applications.filter(a=>a.userId===req.user.id&&a.status==='approved').map(a=>a.driverType);
      if(online&&!approved.length)return {error:'Admin approval is required before going online.',status:403};
      const previous=d.presence[req.user.id]||{};
      const next=online?{online:true,lat:Number(lat),lng:Number(lng),accuracyM:Number.isFinite(Number(req.body?.accuracyM))?Math.max(0,Number(req.body.accuracyM)):null,updatedAt:new Date().toISOString()}:{...previous,online:false,updatedAt:new Date().toISOString()};
      d.presence[req.user.id]=next;
      return {presence:next};
    });
    if(result.error)return res.status(result.status).json({error:result.error});
    broadcastEvent?.('driver:presence_updated',{driverId:req.user.id,online:result.presence.online});
    return res.json({presence:result.presence});
  });
  app.get('/api/driver-presence',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    const d=await readJobs();
    return res.json({presence:d.presence[req.user.id]||{online:false}});
  });
  app.get('/api/my-mobility-jobs',requireAuth,async(req,res)=>{
    const d=await readJobs();
    const jobs=d.jobs.filter(job=>job.customerId===req.user.id).map(job=>{
      const assigned=job.driverId?d.presence[job.driverId]:null;
      return {...job,driverLocation:assigned?.online?{lat:assigned.lat,lng:assigned.lng,updatedAt:assigned.updatedAt}:null};
    });
    return res.json({jobs});
  });
  app.get('/api/driver-jobs',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    const d=await readJobs();const approved=d.applications.filter(a=>a.userId===req.user.id&&a.status==='approved').map(a=>a.driverType);
    const presence=d.presence[req.user.id]||{online:false};
    const jobs=d.jobs
      .filter(j=>approved.includes(j.serviceType)&&(j.driverId===req.user.id||(j.status==='requested'&&presence.online)))
      .map(j=>{const distanceKm=distanceToJob(presence,j);return {...j,distanceKm,etaMinutes:distanceKm===null?null:estimateEtaMinutes(distanceKm)};})
      .sort((a,b)=>{if(a.driverId===req.user.id)return -1;if(b.driverId===req.user.id)return 1;if(a.distanceKm===null)return 1;if(b.distanceKm===null)return -1;return a.distanceKm-b.distanceKm;});
    res.json({jobs,approvedDriverTypes:approved,presence});
  });
  app.post('/api/driver-jobs/:id/claim',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    try{
      const result=await mutateJobs(d=>{
        const job=d.jobs.find(j=>j.id===req.params.id);if(!job)return {status:404,error:'Job not found.'};
        const approved=d.applications.some(a=>a.userId===req.user.id&&a.driverType===job.serviceType&&a.status==='approved');
        if(!approved)return {status:403,error:'You are not approved for this driver network.'};
        const presence=d.presence[req.user.id];
        if(!presence?.online)return {status:409,error:'Go online and share your current location before accepting a new job.'};
        if(job.status!=='requested'||job.driverId)return {status:409,error:'This job has already been accepted by another driver.'};
        job.driverId=req.user.id;job.driverName=req.user.fullName;job.status='accepted';job.acceptedAt=new Date().toISOString();return {status:200,job};
      });
      if(result.error)return res.status(result.status).json({error:result.error});
      broadcastEvent?.('driver:job_updated',{job:result.job});return res.json({job:result.job});
    }catch(error){return res.status(500).json({error:'Could not claim driver job.'});}
  });
  app.patch('/api/driver-jobs/:id/status',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    const status=String(req.body?.status||'');if(!['picked_up','completed'].includes(status))return res.status(400).json({error:'Unsupported job status.'});
    const result=await mutateJobs(d=>{
      const job=d.jobs.find(j=>j.id===req.params.id);if(!job)return {status:404,error:'Job not found.'};
      if(job.driverId!==req.user.id)return {status:403,error:'Only the assigned driver can update this job.'};
      const allowed=job.status==='accepted'&&status==='picked_up'||job.status==='picked_up'&&status==='completed';
      if(!allowed)return {status:409,error:'Invalid job status transition.'};
      job.status=status;job.updatedAt=new Date().toISOString();return {status:200,job};
    });
    if(result.error)return res.status(result.status).json({error:result.error});
    broadcastEvent?.('driver:job_updated',{job:result.job});res.json({job:result.job});
  });
}
