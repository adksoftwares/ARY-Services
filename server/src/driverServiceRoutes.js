import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const dataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'driver-services.json');
let writeQueue = Promise.resolve();
async function readJobs(){try{const d=JSON.parse(await fs.readFile(dataFile,'utf8'));return {applications:d.applications||[],jobs:d.jobs||[]};}catch{return {applications:[],jobs:[]};}}
async function save(data){writeQueue=writeQueue.then(async()=>{await fs.mkdir(path.dirname(dataFile),{recursive:true});await fs.writeFile(dataFile,JSON.stringify(data,null,2));});await writeQueue;}
const id=prefix=>prefix+'_'+crypto.randomUUID().replaceAll('-','').slice(0,12);
const types=['food_delivery','ride'];
export function registerDriverServiceRoutes(app,{requireAuth,requireAdmin,broadcastEvent}){
  app.post('/api/driver-applications',requireAuth,async(req,res)=>{
    const driverType=String(req.body?.driverType||'');
    if(!types.includes(driverType))return res.status(400).json({error:'Choose food_delivery or ride.'});
    const data=await readJobs();
    const existing=data.applications.find(a=>a.userId===req.user.id&&a.driverType===driverType&&a.status==='pending');
    if(existing)return res.status(200).json({application:existing,message:'Application is already pending.'});
    const application={id:id('drvapp'),userId:req.user.id,driverName:req.user.fullName,driverType,status:'pending',createdAt:new Date().toISOString()};
    data.applications.push(application);await save(data);res.status(201).json({application});
  });
  app.get('/api/admin/driver-applications',requireAdmin,async(_req,res)=>{const d=await readJobs();res.json({applications:d.applications});});
  app.patch('/api/admin/driver-applications/:id',requireAdmin,async(req,res)=>{
    const status=String(req.body?.status||'');
    if(!['approved','rejected'].includes(status))return res.status(400).json({error:'Status must be approved or rejected.'});
    const d=await readJobs();const a=d.applications.find(x=>x.id===req.params.id);if(!a)return res.status(404).json({error:'Application not found.'});
    a.status=status;a.reviewedAt=new Date().toISOString();a.reviewedBy=req.user.id;await save(d);res.json({application:a});
  });
  app.post('/api/food-deliveries',requireAuth,async(req,res)=>{
    const {orderReference,restaurantName,pickupAddress,dropoffAddress,notes=''}=req.body||{};
    if(!restaurantName||!pickupAddress||!dropoffAddress)return res.status(400).json({error:'Restaurant, pickup and delivery addresses are required.'});
    const d=await readJobs();const job={id:id('food'),serviceType:'food_delivery',customerId:req.user.id,customerName:req.user.fullName,orderReference:String(orderReference||'').slice(0,80),restaurantName:String(restaurantName).slice(0,160),pickupAddress:String(pickupAddress).slice(0,500),destinationAddress:String(dropoffAddress).slice(0,500),notes:String(notes).slice(0,500),driverId:null,status:'requested',createdAt:new Date().toISOString()};
    d.jobs.unshift(job);await save(d);broadcastEvent?.('driver:job_created',{job});res.status(201).json({job});
  });
  app.post('/api/ride-trips',requireAuth,async(req,res)=>{
    const {pickupAddress,destinationAddress,passengerCount=1,notes=''}=req.body||{};
    const count=Number(passengerCount);
    if(!pickupAddress||!destinationAddress||!Number.isInteger(count)||count<1||count>6)return res.status(400).json({error:'Valid pickup, destination and passenger count (1-6) are required.'});
    const d=await readJobs();const job={id:id('ride'),serviceType:'ride',customerId:req.user.id,customerName:req.user.fullName,pickupAddress:String(pickupAddress).slice(0,500),destinationAddress:String(destinationAddress).slice(0,500),passengerCount:count,notes:String(notes).slice(0,500),driverId:null,status:'requested',createdAt:new Date().toISOString()};
    d.jobs.unshift(job);await save(d);broadcastEvent?.('driver:job_created',{job});res.status(201).json({job});
  });
  app.get('/api/driver-jobs',requireAuth,async(req,res)=>{
    const d=await readJobs();const approved=d.applications.filter(a=>a.userId===req.user.id&&a.status==='approved').map(a=>a.driverType);
    const jobs=d.jobs.filter(j=>approved.includes(j.serviceType)&&(j.status==='requested'||j.driverId===req.user.id));
    res.json({jobs,approvedDriverTypes:approved});
  });
  app.post('/api/driver-jobs/:id/claim',requireAuth,async(req,res)=>{
    const d=await readJobs();const job=d.jobs.find(j=>j.id===req.params.id);if(!job)return res.status(404).json({error:'Job not found.'});
    const approved=d.applications.some(a=>a.userId===req.user.id&&a.driverType===job.serviceType&&a.status==='approved');
    if(!approved)return res.status(403).json({error:'You are not approved for this driver network.'});
    if(job.status!=='requested'||job.driverId)return res.status(409).json({error:'This job has already been accepted by another driver.'});
    job.driverId=req.user.id;job.driverName=req.user.fullName;job.status='accepted';job.acceptedAt=new Date().toISOString();await save(d);broadcastEvent?.('driver:job_updated',{job});res.json({job});
  });
  app.patch('/api/driver-jobs/:id/status',requireAuth,async(req,res)=>{
    const status=String(req.body?.status||'');if(!['picked_up','completed'].includes(status))return res.status(400).json({error:'Unsupported job status.'});
    const d=await readJobs();const job=d.jobs.find(j=>j.id===req.params.id);if(!job)return res.status(404).json({error:'Job not found.'});
    if(job.driverId!==req.user.id)return res.status(403).json({error:'Only the assigned driver can update this job.'});
    const allowed=job.status==='accepted'&&status==='picked_up'||job.status==='picked_up'&&status==='completed';
    if(!allowed)return res.status(409).json({error:'Invalid job status transition.'});
    job.status=status;job.updatedAt=new Date().toISOString();await save(d);broadcastEvent?.('driver:job_updated',{job});res.json({job});
  });
}
