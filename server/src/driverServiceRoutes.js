import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPersistentState, mutatePersistentState } from './storage.js';
import { cleanSriLankaCoordinates, isDriverPresenceFresh, rankJobsForDriver, buildAdminDispatchSnapshot } from './mobilityDispatch.js';

const dataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'driver-services.json');
const emptyDriverState = { applications: [], jobs: [], presence: {} };
async function mutateJobs(mutator) {
  return mutatePersistentState('driver-services', dataFile, emptyDriverState, state => {
    // Backward-compatible migration for existing persisted records created
    // before driver presence tracking was introduced.
    state.applications = Array.isArray(state.applications) ? state.applications : [];
    state.jobs = Array.isArray(state.jobs) ? state.jobs : [];
    state.presence = state.presence && typeof state.presence === 'object' ? state.presence : {};
    return mutator(state);
  });
}
async function readJobs() {
  const state = await readPersistentState('driver-services', dataFile, emptyDriverState);
  return { applications: state.applications || [], jobs: state.jobs || [], presence: state.presence || {} };
}
const id=prefix=>prefix+'_'+crypto.randomUUID().replaceAll('-','').slice(0,12);
const types=['food_delivery','ride','parcel_delivery'];
const cleanCoordinates = cleanSriLankaCoordinates;
const makePin = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const pinDigest = pin => crypto.scryptSync(String(pin), process.env.OTP_SHIELD_SECRET, 32).toString('hex');
const pinMatches = (pin, digest) => {
  if (!/^\d{6}$/.test(String(pin || '')) || !digest) return false;
  const actual = Buffer.from(pinDigest(pin), 'hex'), expected = Buffer.from(digest, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};
function safeMobilityJob(job, viewerId = null) {
  const { startPinHash, pickupPinHash, deliveryPinHash, pinAttempts, deliveryPinAttempts, startPinForCustomer, pickupPinForCustomer, deliveryPinForCustomer, ...safe } = job;
  if (viewerId && job.customerId === viewerId) {
    if (startPinForCustomer) safe.startPin = startPinForCustomer;
    if (pickupPinForCustomer) safe.pickupPin = pickupPinForCustomer;
    if (deliveryPinForCustomer) safe.deliveryPin = deliveryPinForCustomer;
  }
  if (!viewerId || (viewerId !== job.customerId && viewerId !== job.driverId)) { delete safe.customerId; delete safe.customerName; delete safe.pickupContact; delete safe.recipientContact; delete safe.notes; }
  return safe;
}
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
    if(req.user.accountType!=='customer')return res.status(403).json({error:'Customer account required.'});
    const {orderReference,restaurantName,pickupAddress,dropoffAddress,notes=''}=req.body||{};
    if(!orderReference||!pickupAddress||!dropoffAddress)return res.status(400).json({error:'A valid food order reference, pickup and delivery addresses are required.'});
    const orders=await getBookings();const order=orders.find(b=>b.id===String(orderReference)&&b.customerId===req.user.id&&String(b.categorySlug||'').toLowerCase().includes('food'));
    if(!order)return res.status(404).json({error:'Food order not found for this customer. Place a food shop order first.'});
    if(!['accepted','preparing','ready'].includes(order.status))return res.status(409).json({error:'The restaurant must accept or prepare the food order before delivery can be requested.'});
    const users=await getUsers();const restaurant=users.find(u=>u.id===order.providerId);
    const destination=cleanCoordinates(req.body?.destinationLat,req.body?.destinationLng);
    const pickupPin=makePin(),deliveryPin=makePin();
    const job={id:id('food'),serviceType:'food_delivery',customerId:req.user.id,customerName:req.user.fullName,orderReference:order.id,restaurantName:String(restaurantName||order.providerName||'Food Shop').slice(0,160),pickupAddress:String(pickupAddress||restaurant?.location||'').slice(0,500),destinationAddress:String(dropoffAddress).slice(0,500),destinationLat:destination?.lat??null,destinationLng:destination?.lng??null,notes:String(notes).slice(0,500),driverId:null,status:'requested',pickupPinHash:pinDigest(pickupPin),deliveryPinHash:pinDigest(deliveryPin),pickupPinForCustomer:pickupPin,deliveryPinForCustomer:deliveryPin,pinAttempts:0,deliveryPinAttempts:0,createdAt:new Date().toISOString()};
    await mutateJobs(d=>{d.jobs.unshift(job);});
    broadcastEvent?.('driver:job_created',{job:safeMobilityJob(job)});res.status(201).json({job:safeMobilityJob(job,req.user.id)});
  });
  app.post('/api/ride-trips',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='customer')return res.status(403).json({error:'Customer account required.'});
    const {pickupAddress,destinationAddress,passengerCount=1,notes=''}=req.body||{};
    const count=Number(passengerCount);
    if(!pickupAddress||!destinationAddress||!Number.isInteger(count)||count<1||count>6)return res.status(400).json({error:'Valid pickup, destination and passenger count (1-6) are required.'});
    const pickup=cleanCoordinates(req.body?.pickupLat,req.body?.pickupLng);
    const destination=cleanCoordinates(req.body?.destinationLat,req.body?.destinationLng);
    const startPin=makePin();
    const job={id:id('ride'),serviceType:'ride',customerId:req.user.id,customerName:req.user.fullName,pickupAddress:String(pickupAddress).slice(0,500),destinationAddress:String(destinationAddress).slice(0,500),pickupLat:pickup?.lat??null,pickupLng:pickup?.lng??null,destinationLat:destination?.lat??null,destinationLng:destination?.lng??null,passengerCount:count,notes:String(notes).slice(0,500),driverId:null,status:'requested',startPinHash:pinDigest(startPin),startPinForCustomer:startPin,pinAttempts:0,createdAt:new Date().toISOString()};
    await mutateJobs(d=>{d.jobs.unshift(job);});
    broadcastEvent?.('driver:job_created',{job:safeMobilityJob(job)});res.status(201).json({job:safeMobilityJob(job,req.user.id)});
  });
  app.post('/api/parcels',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='customer')return res.status(403).json({error:'Customer account required.'});
    const pickupAddress=String(req.body?.pickupAddress||'').trim(),destinationAddress=String(req.body?.destinationAddress||'').trim();
    const pickupContact=String(req.body?.pickupContact||req.user.phone||'').trim().slice(0,120),recipientContact=String(req.body?.recipientContact||'').trim().slice(0,120);
    const weightKg=Number(req.body?.weightKg);
    if(!pickupAddress||!destinationAddress||!pickupContact||!recipientContact||!Number.isFinite(weightKg)||weightKg<=0||weightKg>100)return res.status(400).json({error:'Enter pickup/drop-off addresses, contact numbers and parcel weight (0-100 kg).'});
    const pickup=cleanCoordinates(req.body?.pickupLat,req.body?.pickupLng),destination=cleanCoordinates(req.body?.destinationLat,req.body?.destinationLng);
    const pickupPin=makePin(),deliveryPin=makePin();
    const job={id:id('parcel'),serviceType:'parcel_delivery',customerId:req.user.id,customerName:req.user.fullName,pickupAddress:pickupAddress.slice(0,500),destinationAddress:destinationAddress.slice(0,500),pickupContact,recipientContact,parcelType:String(req.body?.parcelType||'standard').slice(0,60),weightKg,notes:String(req.body?.notes||'').slice(0,500),pickupLat:pickup?.lat??null,pickupLng:pickup?.lng??null,destinationLat:destination?.lat??null,destinationLng:destination?.lng??null,driverId:null,status:'requested',pickupPinHash:pinDigest(pickupPin),deliveryPinHash:pinDigest(deliveryPin),pickupPinForCustomer:pickupPin,deliveryPinForCustomer:deliveryPin,pinAttempts:0,deliveryPinAttempts:0,createdAt:new Date().toISOString()};
    await mutateJobs(state=>{state.jobs.unshift(job);});
    broadcastEvent?.('driver:job_created',{job:safeMobilityJob(job)});
    return res.status(201).json({job:safeMobilityJob(job,req.user.id)});
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
  app.patch('/api/my-mobility-jobs/:id/cancel',requireAuth,async(req,res)=>{
    const result=await mutateJobs(d=>{
      const job=d.jobs.find(item=>item.id===req.params.id);
      if(!job)return {status:404,error:'Ride or delivery request not found.'};
      if(job.customerId!==req.user.id)return {status:403,error:'You can only cancel your own request.'};
      if(job.status!=='requested')return {status:409,error:'A request can only be cancelled before a driver accepts it.'};
      job.status='cancelled';job.cancelledAt=new Date().toISOString();return {status:200,job};
    });
    if(result.error)return res.status(result.status).json({error:result.error});
    broadcastEvent?.('driver:job_updated',{job:safeMobilityJob(result.job)});
    return res.json({job:safeMobilityJob(result.job,req.user.id)});
  });
  app.get('/api/my-mobility-jobs',requireAuth,async(req,res)=>{
    const d=await readJobs();
    const jobs=d.jobs.filter(job=>job.customerId===req.user.id).map(job=>{
      const assigned=job.driverId?d.presence[job.driverId]:null;
      return {...safeMobilityJob(job,req.user.id),driverLocation:isDriverPresenceFresh(assigned)?{lat:assigned.lat,lng:assigned.lng,updatedAt:assigned.updatedAt}:null};
    });
    return res.json({jobs});
  });
  app.get('/api/driver-jobs',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    const d=await readJobs();const approved=d.applications.filter(a=>a.userId===req.user.id&&a.status==='approved').map(a=>a.driverType);
    const presence=d.presence[req.user.id]||{online:false};
    const freshPresence=isDriverPresenceFresh(presence);
    const jobs=rankJobsForDriver(
      d.jobs.filter(j=>approved.includes(j.serviceType)&&(j.driverId===req.user.id||(j.status==='requested'&&freshPresence))),
      presence
    );
    res.json({jobs:jobs.map(job=>safeMobilityJob(job,req.user.id)),approvedDriverTypes:approved,presence:{...presence,online:freshPresence}});
  });
  app.post('/api/driver-jobs/:id/claim',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    try{
      const result=await mutateJobs(d=>{
        const job=d.jobs.find(j=>j.id===req.params.id);if(!job)return {status:404,error:'Job not found.'};
        const approved=d.applications.some(a=>a.userId===req.user.id&&a.driverType===job.serviceType&&a.status==='approved');
        if(!approved)return {status:403,error:'You are not approved for this driver network.'};
        const presence=d.presence[req.user.id];
        if(!isDriverPresenceFresh(presence))return {status:409,error:'Your GPS location is stale. Refresh your location and go online before accepting a new job.'};
        if(job.status!=='requested'||job.driverId)return {status:409,error:'This job has already been accepted by another driver.'};
        if(d.jobs.some(j=>j.driverId===req.user.id&&!['completed','delivered','cancelled','failed_attempt','returned'].includes(j.status)))return {status:409,error:'Complete or release your current active job before accepting another.'};
        job.driverId=req.user.id;job.driverName=req.user.fullName;job.status='accepted';job.acceptedAt=new Date().toISOString();return {status:200,job};
      });
      if(result.error)return res.status(result.status).json({error:result.error});
      broadcastEvent?.('driver:job_updated',{job:safeMobilityJob(result.job)});return res.json({job:safeMobilityJob(result.job,req.user.id)});
    }catch(error){return res.status(500).json({error:'Could not claim driver job.'});}
  });
  app.patch('/api/driver-jobs/:id/status',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    const status=String(req.body?.status||'');if(!['arrived','arrived_pickup','in_transit'].includes(status))return res.status(400).json({error:'Use the arrival or delivery workflow for this job status.'});
    const result=await mutateJobs(d=>{
      const job=d.jobs.find(j=>j.id===req.params.id);if(!job)return {status:404,error:'Job not found.'};
      if(job.driverId!==req.user.id)return {status:403,error:'Only the assigned driver can update this job.'};
      const allowed=(job.status==='accepted'&&((job.serviceType==='ride'&&status==='arrived')||(job.serviceType!=='ride'&&status==='arrived_pickup')))||(job.status==='picked_up'&&status==='in_transit');
      if(!allowed)return {status:409,error:'Invalid job status transition.'};
      job.status=status;job.updatedAt=new Date().toISOString();return {status:200,job};
    });
    if(result.error)return res.status(result.status).json({error:result.error});
    broadcastEvent?.('driver:job_updated',{job:safeMobilityJob(result.job)});res.json({job:safeMobilityJob(result.job,req.user.id)});
  });
  app.post('/api/driver-jobs/:id/verify-pickup',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    const result=await mutateJobs(state=>{const job=state.jobs.find(item=>item.id===req.params.id);if(!job)return {status:404,error:'Job not found.'};if(job.driverId!==req.user.id)return {status:403,error:'Only the assigned driver can verify pickup.'};const expected=job.serviceType==='ride'?'arrived':'arrived_pickup';if(job.status!==expected)return {status:409,error:'Driver must mark arrival before pickup verification.'};if((job.pinAttempts||0)>=5)return {status:429,error:'Pickup PIN attempts exceeded. Contact ARY support.'};const hash=job.serviceType==='ride'?job.startPinHash:job.pickupPinHash;if(!pinMatches(req.body?.pin,hash)){job.pinAttempts=(job.pinAttempts||0)+1;return {status:400,error:'Incorrect pickup PIN.'};}job.status=job.serviceType==='ride'?'in_progress':'picked_up';job.pickupVerifiedAt=new Date().toISOString();job.pinAttempts=0;return {status:200,job};});
    if(result.error)return res.status(result.status).json({error:result.error});broadcastEvent?.('driver:job_updated',{job:safeMobilityJob(result.job)});return res.json({job:safeMobilityJob(result.job,req.user.id)});
  });
  app.post('/api/driver-jobs/:id/verify-delivery',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    const result=await mutateJobs(state=>{const job=state.jobs.find(item=>item.id===req.params.id);if(!job)return {status:404,error:'Job not found.'};if(job.driverId!==req.user.id)return {status:403,error:'Only the assigned driver can verify delivery.'};const allowed=job.serviceType==='ride'?job.status==='in_progress':['picked_up','in_transit'].includes(job.status);if(!allowed)return {status:409,error:'Pickup must be verified before completing this job.'};if((job.deliveryPinAttempts||0)>=5)return {status:429,error:'Delivery PIN attempts exceeded. Contact ARY support.'};if(!pinMatches(req.body?.pin,job.deliveryPinHash)){job.deliveryPinAttempts=(job.deliveryPinAttempts||0)+1;return {status:400,error:'Incorrect delivery PIN.'};}job.status=job.serviceType==='ride'?'completed':'delivered';job.completedAt=new Date().toISOString();job.deliveryVerifiedAt=job.completedAt;job.deliveryPinAttempts=0;return {status:200,job};});
    if(result.error)return res.status(result.status).json({error:result.error});broadcastEvent?.('driver:job_updated',{job:safeMobilityJob(result.job)});return res.json({job:safeMobilityJob(result.job,req.user.id)});
  });

  // Admin-only operational view: expose dispatch health without account/KYC/payment data.
  app.get('/api/admin/driver-dispatch',requireAdmin,async(_req,res)=>{
    const d=await readJobs();
    return res.json(buildAdminDispatchSnapshot(d.jobs,d.applications,d.presence));
  });
  // An assigned driver may release a job only before pickup; completed/picked-up trips are immutable here.
  app.patch('/api/driver-jobs/:id/cancel',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    const reason=String(req.body?.reason||'').trim().slice(0,240);
    const result=await mutateJobs(d=>{
      const job=d.jobs.find(item=>item.id===req.params.id);
      if(!job)return {status:404,error:'Job not found.'};
      if(job.driverId!==req.user.id)return {status:403,error:'Only the assigned driver can release this job.'};
      if(!['accepted','arrived','arrived_pickup'].includes(job.status))return {status:409,error:'A driver can release a job only before pickup.'};
      job.status='cancelled';job.cancelledAt=new Date().toISOString();job.cancelledBy='driver';job.cancellationReason=reason||'Driver released before pickup';job.driverId=null;job.driverName=null;
      return {status:200,job};
    });
    if(result.error)return res.status(result.status).json({error:result.error});
    broadcastEvent?.('driver:job_updated',{job:safeMobilityJob(result.job)});return res.json({job:safeMobilityJob(result.job,req.user.id)});
  });
}
