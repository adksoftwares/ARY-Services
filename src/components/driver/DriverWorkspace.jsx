import React, { useEffect, useState } from 'react';
import { Bike, PackageCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';

export default function DriverWorkspace({ onNotice }) {
  const { currentUser } = useAuth();
  const [jobs,setJobs]=useState([]);
  const [application,setApplication]=useState('food_delivery');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  async function refresh(){
    if(!currentUser?.token)return;
    setLoading(true);setError('');
    try{const r=await fetch(API_BASE+'/driver-jobs',{headers:{Authorization:'Bearer '+currentUser.token}});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not load driver jobs');setJobs(d.jobs||[]);}
    catch(e){setError(e.message);}finally{setLoading(false);}
  }
  useEffect(()=>{refresh();},[currentUser?.token]);
  async function apply(){
    try{const r=await fetch(API_BASE+'/driver-applications',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+currentUser.token},body:JSON.stringify({driverType:application})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Application failed');onNotice?.('Driver application submitted for admin approval.');}
    catch(e){setError(e.message);}
  }
  async function claim(id){
    try{const r=await fetch(API_BASE+'/driver-jobs/'+id+'/claim',{method:'POST',headers:{Authorization:'Bearer '+currentUser.token}});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not claim job');await refresh();onNotice?.('Job accepted.');}
    catch(e){setError(e.message);}
  }
  async function update(id,status){
    try{const r=await fetch(API_BASE+'/driver-jobs/'+id+'/status',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+currentUser.token},body:JSON.stringify({status})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not update job');await refresh();}
    catch(e){setError(e.message);}
  }
  return <main style={{maxWidth:1050,margin:'35px auto',padding:'0 18px',minHeight:'60vh'}}>
    <span className="eyebrow">SEPARATE DRIVER OPERATIONS</span><h1 style={{fontSize:38}}>Driver <em>workspace.</em></h1>
    <section style={{padding:20,border:'1px solid #e5ebe3',borderRadius:14,background:'#fff',margin:'22px 0'}}>
      <h3>Apply for a driver network</h3><p style={{fontSize:13,color:'#6d786f'}}>Choose one driver type. Admin approval is required before you can accept matching jobs.</p>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><select value={application} onChange={e=>setApplication(e.target.value)} style={{padding:11,border:'1px solid #dce5dc',borderRadius:8}}><option value="food_delivery">Food Delivery Driver</option><option value="ride">Ride Driver</option></select><button onClick={apply} style={{padding:'11px 16px',border:0,borderRadius:8,background:'#174d3d',color:'#fff',fontWeight:700}}>Submit application</button></div>
    </section>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><h2 style={{fontSize:22,margin:0}}>Available and assigned jobs</h2><button onClick={refresh} style={{padding:9,border:'1px solid #dce5dc',borderRadius:8,background:'#fff'}}><RefreshCw size={16}/></button></div>
    {error&&<p role="alert" style={{color:'#a33'}}>{error}</p>}
    {loading?<p>Loading jobs...</p>:jobs.length===0?<p style={{color:'#778078'}}>No jobs available for your approved driver type.</p>:jobs.map(j=><article key={j.id} style={{padding:17,border:'1px solid #e5ebe3',borderRadius:12,background:'#fff',marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><b style={{display:'flex',alignItems:'center',gap:8}}>{j.serviceType==='food_delivery'?<PackageCheck size={17}/>:<Bike size={17}/>} {j.serviceType==='food_delivery'?'Food Delivery':'Passenger Ride'} · {j.id}</b><span style={{fontSize:12,color:'#627268'}}>{j.status}</span></div>
      <p style={{fontSize:13,color:'#68756b',lineHeight:1.7,margin:'10px 0'}}>Pickup: {j.pickupAddress}<br/>Drop-off: {j.destinationAddress}</p>
      {j.status==='requested'&&<button onClick={()=>claim(j.id)} style={{padding:'9px 14px',border:0,borderRadius:8,background:'#174d3d',color:'#fff'}}>Accept job</button>}
      {j.status==='accepted'&&<button onClick={()=>update(j.id,'picked_up')} style={{padding:'9px 14px',border:0,borderRadius:8,background:'#174d3d',color:'#fff'}}>Picked up / passenger onboard</button>}
      {j.status==='picked_up'&&<button onClick={()=>update(j.id,'completed')} style={{padding:'9px 14px',border:0,borderRadius:8,background:'#174d3d',color:'#fff'}}>Complete trip / delivery</button>}
      {j.status==='completed'&&<span style={{display:'flex',alignItems:'center',gap:6,color:'#27724b',fontSize:12}}><CheckCircle2 size={15}/> Completed</span>}
    </article>)}
  </main>;
}
