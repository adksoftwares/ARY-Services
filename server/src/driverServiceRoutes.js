import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPersistentState, mutatePersistentState } from './storage.js';

const dataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'driver-services.json');
const emptyDriverState = { applications: [], jobs: [] };
async function mutateJobs(mutator) {
  return mutatePersistentState('driver-services', dataFile, emptyDriverState, mutator);
}
async function readJobs() {
  const state = await readPersistentState('driver-services', dataFile, emptyDriverState);
  return { applications: state.applications || [], jobs: state.jobs || [] };
}
const id=prefix=>prefix+'_'+crypto.randomUUID().replaceAll('-','').slice(0,12);
const types=['food_delivery','ride'];
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
    const job={id:id('food'),serviceType:'food_delivery',customerId:req.user.id,customerName:req.user.fullName,orderReference:order.id,restaurantName:String(restaurantName||order.providerName||'Food Shop').slice(0,160),pickupAddress:String(pickupAddress||restaurant?.location||'').slice(0,500),destinationAddress:String(dropoffAddress).slice(0,500),notes:String(notes).slice(0,500),driverId:null,status:'requested',createdAt:new Date().toISOString()};
    await mutateJobs(d=>{d.jobs.unshift(job);});
    broadcastEvent?.('driver:job_created',{job});res.status(201).json({job});
  });
  app.post('/api/ride-trips',requireAuth,async(req,res)=>{
    const {pickupAddress,destinationAddress,passengerCount=1,notes=''}=req.body||{};
    const count=Number(passengerCount);
    if(!pickupAddress||!destinationAddress||!Number.isInteger(count)||count<1||count>6)return res.status(400).json({error:'Valid pickup, destination and passenger count (1-6) are required.'});
    const job={id:id('ride'),serviceType:'ride',customerId:req.user.id,customerName:req.user.fullName,pickupAddress:String(pickupAddress).slice(0,500),destinationAddress:String(destinationAddress).slice(0,500),passengerCount:count,notes:String(notes).slice(0,500),driverId:null,status:'requested',createdAt:new Date().toISOString()};
    await mutateJobs(d=>{d.jobs.unshift(job);});
    broadcastEvent?.('driver:job_created',{job});res.status(201).json({job});
  });
  app.get('/api/driver-jobs',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    const d=await readJobs();const approved=d.applications.filter(a=>a.userId===req.user.id&&a.status==='approved').map(a=>a.driverType);
    const jobs=d.jobs.filter(j=>approved.includes(j.serviceType)&&(j.status==='requested'||j.driverId===req.user.id));
    res.json({jobs,approvedDriverTypes:approved});
  });
  app.post('/api/driver-jobs/:id/claim',requireAuth,async(req,res)=>{
    if(req.user.accountType!=='driver')return res.status(403).json({error:'Driver account required.'});
    try{
      const result=await mutateJobs(d=>{
        const job=d.jobs.find(j=>j.id===req.params.id);if(!job)return {status:404,error:'Job not found.'};
        const approved=d.applications.some(a=>a.userId===req.user.id&&a.driverType===job.serviceType&&a.status==='approved');
        if(!approved)return {status:403,error:'You are not approved for this driver network.'};
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
