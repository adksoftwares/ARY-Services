import React, { useState } from 'react';
import { Bike, Utensils, MapPin, ArrowRight, PackageCheck, CarFront } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';

export default function MobilityServices({ onNotice }) {
  const { currentUser, openAuthModal } = useAuth();
  const [mode, setMode] = useState('food');
  const [form, setForm] = useState({ orderReference: '', restaurantName: '', pickupAddress: '', dropoffAddress: '', pickup: '', destination: '', passengerCount: '1', notes: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const change = (key, value) => setForm(old => ({ ...old, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    if (!currentUser?.token) { openAuthModal('login'); return; }
    setBusy(true); setMessage('');
    const endpoint = mode === 'food' ? '/food-deliveries' : '/ride-trips';
    const payload = mode === 'food'
      ? { orderReference: form.orderReference.trim(), restaurantName: form.restaurantName.trim(), pickupAddress: form.pickupAddress.trim(), dropoffAddress: form.dropoffAddress.trim(), notes: form.notes.trim() }
      : { pickupAddress: form.pickup.trim(), destinationAddress: form.destination.trim(), passengerCount: Number(form.passengerCount), notes: form.notes.trim() };
    try {
      const res = await fetch(API_BASE + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + currentUser.token }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit request.');
      setMessage((mode === 'food' ? 'Food delivery' : 'Ride') + ' request created: ' + data.job.id);
      setForm(old => ({ ...old, orderReference: '', notes: '' }));
      onNotice?.((mode === 'food' ? 'Food delivery' : 'Ride') + ' request sent. A matching driver can accept it.');
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }

  const inputStyle = { width: '100%', padding: '12px 13px', border: '1px solid #dce5dc', borderRadius: 9, font: 'inherit', fontSize: 13, background: '#fff', color: '#263a30' };
  return <section className="services-section" id="mobility-services">
    <div className="section-heading"><div><span className="eyebrow">TWO DIFFERENT DRIVER NETWORKS</span><h2>Delivery or a ride?</h2></div><span className="section-note">Separate services. Separate drivers.</span></div>
    <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}>
      <button type="button" onClick={()=>setMode('food')} style={{display:'flex',alignItems:'center',gap:9,padding:'12px 18px',borderRadius:10,border:'1px solid '+(mode==='food'?'#174d3d':'#e1e8df'),background:mode==='food'?'#edf5ef':'#fff',color:'#204333',fontWeight:700}}><Utensils size={18}/> Food Delivery</button>
      <button type="button" onClick={()=>setMode('ride')} style={{display:'flex',alignItems:'center',gap:9,padding:'12px 18px',borderRadius:10,border:'1px solid '+(mode==='ride'?'#174d3d':'#e1e8df'),background:mode==='ride'?'#edf5ef':'#fff',color:'#204333',fontWeight:700}}><CarFront size={18}/> Ride Service</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(220px,.55fr)',gap:18,alignItems:'start'}}>
      <form onSubmit={submit} style={{background:'#fff',border:'1px solid #e7ece5',borderRadius:14,padding:20,display:'grid',gap:12}}>
        {mode==='food' ? <>
          <b style={{display:'flex',alignItems:'center',gap:8,color:'#244333'}}><PackageCheck size={18}/> Request a food delivery driver</b><p style={{fontSize:11,color:'#718076',margin:0}}>First place a Food Shops order and wait until the shop accepts it. Then enter that booking ID here.</p>
          <label style={{fontSize:12,fontWeight:600}}>Order reference (if available)<input style={inputStyle} value={form.orderReference} onChange={e=>change('orderReference',e.target.value)} placeholder="Paste your food shop booking ID" required/></label>
          <label style={{fontSize:12,fontWeight:600}}>Restaurant / food shop<input required style={inputStyle} value={form.restaurantName} onChange={e=>change('restaurantName',e.target.value)} placeholder="Restaurant name"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Pickup address<input required style={inputStyle} value={form.pickupAddress} onChange={e=>change('pickupAddress',e.target.value)} placeholder="Restaurant pickup location"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Customer delivery address<input required style={inputStyle} value={form.dropoffAddress} onChange={e=>change('dropoffAddress',e.target.value)} placeholder="Where should the food be delivered?"/></label>
        </> : <>
          <b style={{display:'flex',alignItems:'center',gap:8,color:'#244333'}}><Bike size={18}/> Request a ride driver</b>
          <label style={{fontSize:12,fontWeight:600}}>Pickup location<input required style={inputStyle} value={form.pickup} onChange={e=>change('pickup',e.target.value)} placeholder="Where should the driver pick you up?"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Destination<input required style={inputStyle} value={form.destination} onChange={e=>change('destination',e.target.value)} placeholder="Where are you going?"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Passengers<select style={inputStyle} value={form.passengerCount} onChange={e=>change('passengerCount',e.target.value)}><option value="1">1 passenger</option><option value="2">2 passengers</option><option value="3">3 passengers</option><option value="4">4 passengers</option><option value="5">5 passengers</option><option value="6">6 passengers</option></select></label>
        </>}
        <label style={{fontSize:12,fontWeight:600}}>Additional note (optional)<input style={inputStyle} value={form.notes} onChange={e=>change('notes',e.target.value)} placeholder="Any useful details"/></label>
        {message && <p role="status" style={{fontSize:12,color:message.includes('created')?'#247347':'#a33'}}>{message}</p>}
        <button disabled={busy} type="submit" style={{display:'flex',justifyContent:'center',alignItems:'center',gap:8,padding:13,border:0,borderRadius:9,background:'#174d3d',color:'#fff',fontWeight:700}}>{busy?'Sending...':mode==='food'?'Find a food delivery driver':'Find a ride driver'} <ArrowRight size={16}/></button>
      </form>
      <aside style={{background:'#f0f4ed',borderRadius:14,padding:20}}>
        <span style={{display:'grid',placeItems:'center',width:44,height:44,borderRadius:12,background:'#dce9dc',color:'#285a43'}}>{mode==='food'?<Utensils/>:<CarFront/>}</span>
        <h3 style={{margin:'15px 0 8px',fontSize:16}}>{mode==='food'?'Food delivery network':'Ride network'}</h3>
        <p style={{fontSize:12,lineHeight:1.8,color:'#657468'}}>{mode==='food'?'A separate delivery driver collects an already placed restaurant order and delivers it to the customer.':'A ride driver accepts a passenger trip from a pickup point to a destination.'}</p>
        <p style={{fontSize:11,lineHeight:1.7,color:'#718076'}}>These requests are kept separate. A ride driver cannot claim food delivery jobs, and a food delivery driver cannot claim passenger rides.</p>
      </aside>
    </div>
  </section>;
}
