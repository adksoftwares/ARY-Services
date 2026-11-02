import React, { useEffect, useState } from 'react';
import { BriefcaseBusiness, Bike, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AccountRoleRequest({ onNotice }) {
  const { currentUser, applyForRole, switchRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('provider');
  const [category, setCategory] = useState('other-services');
  const [categoryName, setCategoryName] = useState('Other Services');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [nicNumber, setNicNumber] = useState('');
  const [operatingMode, setOperatingMode] = useState('mobile');
  const [nsnNumber, setNsnNumber] = useState('');
  const [baseCharge, setBaseCharge] = useState('LKR 1,500');
  const [driverServices, setDriverServices] = useState(['ride']);
  const [busy, setBusy] = useState(false);

  const roles = currentUser?.roles || (currentUser ? [currentUser.accountType] : []);
  const applications = currentUser?.roleApplications || {};

  useEffect(() => {
    if (!currentUser) return;
    if (roles.includes('provider') && !roles.includes('driver')) setRole('driver');
    else if (!roles.includes('provider')) setRole('provider');
  }, [currentUser?.id, currentUser?.accountType, currentUser?.roles?.join(',')]);

  if (!currentUser) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const details = role === 'provider'
        ? { category, categoryName, location, nicNumber, operatingMode, nsnNumber, baseCharge }
        : { driverServices };
      await applyForRole(role, details);
      onNotice?.(`${role === 'provider' ? 'Provider' : 'Driver'} role application sent for Admin approval.`);
      setOpen(false);
    } catch (error) {
      onNotice?.(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function openRole(nextRole) {
    try {
      await switchRole(nextRole);
      window.location.href = nextRole === 'provider' ? '/provider.html' : nextRole === 'driver' ? '/driver.html' : '/';
    } catch (error) {
      onNotice?.(error.message);
    }
  }

  return <section style={{margin:'14px auto',maxWidth:1100,padding:'0 20px'}}>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
      {roles.includes('provider') && currentUser.accountType !== 'provider' && <button className="sign-in" onClick={()=>openRole('provider')}><BriefcaseBusiness size={14}/> Open Provider app</button>}
      {roles.includes('driver') && currentUser.accountType !== 'driver' && <button className="sign-in" onClick={()=>openRole('driver')}><Bike size={14}/> Open Driver app</button>}
      {['provider','driver'].some(r=>applications[r]?.status==='pending') && <span style={{fontSize:12,color:'#8a5a12'}}>Additional role application pending Admin review</span>}
      {(!roles.includes('provider') || !roles.includes('driver')) && <button className="sign-in" onClick={()=>setOpen(v=>!v)}><ShieldCheck size={14}/> Apply for an additional role</button>}
      {(roles.includes('provider') || roles.includes('driver')) && <button className="sign-in" onClick={()=>setOpen(v=>!v)}>Request another role</button>}
    </div>
    {open && <form onSubmit={submit} style={{marginTop:14,background:'#fff',border:'1px solid #e5ebe2',borderRadius:14,padding:18,display:'grid',gap:12}}>
      <div><b style={{color:'#173b2f'}}>Add a role to your ARY account</b><p style={{fontSize:12,color:'#647368',margin:'4px 0'}}>Your Customer access stays active. New Provider or Driver access starts only after Admin approval.</p></div>
      <label style={{display:'grid',gap:5,fontSize:13}}>Role to request<select value={role} onChange={e=>setRole(e.target.value)} style={{padding:10,border:'1px solid #dce2d9',borderRadius:8}}><option value="provider" disabled={roles.includes('provider')}>Service Provider</option><option value="driver" disabled={roles.includes('driver')}>Driver</option></select></label>
      {role==='provider' ? <>
        <label style={{display:'grid',gap:5,fontSize:13}}>Service category<select value={category} onChange={e=>{setCategory(e.target.value);setCategoryName(e.target.selectedOptions[0].text);}} style={{padding:10,border:'1px solid #dce2d9',borderRadius:8}}><option value="electrical-repair">Electrical Repair</option><option value="plumbing">Plumbing</option><option value="food-shops">Food Shops</option><option value="grocery-products">Grocery Products</option><option value="other-services">Other Services</option></select></label>
        <label style={{display:'grid',gap:5,fontSize:13}}>Business / service address<input required value={location} onChange={e=>setLocation(e.target.value)} placeholder="Town, district" style={{padding:10,border:'1px solid #dce2d9',borderRadius:8}}/></label>
        <label style={{display:'grid',gap:5,fontSize:13}}>NIC number<input required value={nicNumber} onChange={e=>setNicNumber(e.target.value)} placeholder="951234567V or 199512345678" style={{padding:10,border:'1px solid #dce2d9',borderRadius:8}}/></label>
        <label style={{display:'grid',gap:5,fontSize:13}}>Operating mode<select value={operatingMode} onChange={e=>setOperatingMode(e.target.value)} style={{padding:10,border:'1px solid #dce2d9',borderRadius:8}}><option value="shop">Shop-based</option><option value="online">Online</option><option value="mobile">Mobile / On-location</option></select></label>
        <label style={{display:'grid',gap:5,fontSize:13}}>NSN number<input required value={nsnNumber} onChange={e=>setNsnNumber(e.target.value)} placeholder="Enter your NSN number" style={{padding:10,border:'1px solid #dce2d9',borderRadius:8}}/></label>
        <label style={{display:'grid',gap:5,fontSize:13}}>Base charge<input value={baseCharge} onChange={e=>setBaseCharge(e.target.value)} style={{padding:10,border:'1px solid #dce2d9',borderRadius:8}}/></label>
      </> : <fieldset style={{border:'1px solid #e5ebe2',borderRadius:8,padding:12}}><legend style={{fontSize:13}}>Driver services</legend>{[['ride','Passenger rides'],['food_delivery','Food delivery']].map(([value,label])=><label key={value} style={{display:'flex',gap:8,margin:'8px 0',fontSize:13}}><input type="checkbox" checked={driverServices.includes(value)} onChange={e=>setDriverServices(old=>e.target.checked?[...old,value]:old.filter(x=>x!==value))}/>{label}</label>)}</fieldset>}
      <div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button type="button" className="sign-in" onClick={()=>setOpen(false)}>Cancel</button><button type="submit" className="register-nav-btn" disabled={busy}>{busy?'Submitting…':'Submit for Admin approval'} <ArrowRight size={14}/></button></div>
    </form>}
  </section>;
}
