import React, { useCallback, useEffect, useState } from 'react';
import { Bike, Utensils, MapPin, ArrowRight, PackageCheck, CarFront } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { subscribeToAppEvents } from '../../utils/events';

export default function MobilityServices({ onNotice }) {
  const { currentUser, openAuthModal } = useAuth();
  const [mode, setMode] = useState('food');
  const [form, setForm] = useState({ orderReference: '', restaurantName: '', pickupAddress: '', dropoffAddress: '', pickup: '', destination: '', passengerCount: '1', pickupContact: '', recipientContact: '', parcelType: 'standard', weightKg: '1', notes: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [gps, setGps] = useState(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [myJobs, setMyJobs] = useState([]);
  const [jobsError, setJobsError] = useState('');
  const change = (key, value) => setForm(old => ({ ...old, [key]: value }));

  const refreshJobs = useCallback(async () => {
    if (!currentUser?.token) { setMyJobs([]); return; }
    try {
      const response = await fetch(API_BASE + '/my-mobility-jobs', {
        headers: { Authorization: 'Bearer ' + currentUser.token }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load your ride and delivery requests.');
      setMyJobs(data.jobs || []);
      setJobsError('');
    } catch (err) {
      setJobsError(err.message || 'Could not load your requests.');
    }
  }, [currentUser?.token]);

  useEffect(() => { refreshJobs(); }, [refreshJobs]);

  useEffect(() => {
    if (!currentUser?.token) return undefined;
    const refresh = () => refreshJobs();
    return subscribeToAppEvents(currentUser?.token, {
      'driver:job_created': refresh,
      'driver:job_updated': refresh,
      'driver:presence_updated': refresh
    });
  }, [currentUser?.token, refreshJobs]);

  async function cancelRequest(jobId) {
    try {
      const response = await fetch(API_BASE + '/my-mobility-jobs/' + encodeURIComponent(jobId) + '/cancel', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + currentUser.token }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not cancel this request.');
      await refreshJobs();
      setMessage('Request cancelled.');
    } catch (err) {
      setJobsError(err.message || 'Could not cancel this request.');
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) { setMessage('This browser does not support GPS location.'); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(position => {
      setGps({ lat: position.coords.latitude, lng: position.coords.longitude, accuracyM: position.coords.accuracy });
      setGpsBusy(false);
      setMessage('GPS location added to this request.');
    }, error => {
      setGpsBusy(false);
      setMessage(error.code === 1 ? 'Location permission was denied. You can still enter the address manually.' : 'Could not read GPS location. Please try again or enter the address manually.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
  }

  async function submit(e) {
    e.preventDefault();
    if (!currentUser?.token) { openAuthModal('login'); return; }
    setBusy(true); setMessage('');
    const endpoint = mode === 'food' ? '/food-deliveries' : mode === 'parcel' ? '/parcels' : '/ride-trips';
    const payload = mode === 'food'
      ? { orderReference: form.orderReference.trim(), restaurantName: form.restaurantName.trim(), pickupAddress: form.pickupAddress.trim(), dropoffAddress: form.dropoffAddress.trim(), destinationLat: gps?.lat, destinationLng: gps?.lng, notes: form.notes.trim() }
      : mode === 'parcel' ? { pickupAddress: form.pickup.trim(), destinationAddress: form.destination.trim(), pickupContact: form.pickupContact.trim(), recipientContact: form.recipientContact.trim(), parcelType: form.parcelType, weightKg: Number(form.weightKg), pickupLat: gps?.lat, pickupLng: gps?.lng, notes: form.notes.trim() } : { pickupAddress: form.pickup.trim(), destinationAddress: form.destination.trim(), pickupLat: gps?.lat, pickupLng: gps?.lng, passengerCount: Number(form.passengerCount), notes: form.notes.trim() };
    try {
      const res = await fetch(API_BASE + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + currentUser.token }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit request.');
      setMessage((mode === 'food' ? 'Food delivery' : mode === 'parcel' ? 'Parcel delivery' : 'Ride') + ' request created: ' + data.job.id);
      setForm(old => ({ ...old, orderReference: '', notes: '' }));
      await refreshJobs();
      onNotice?.((mode === 'food' ? 'Food delivery' : mode === 'parcel' ? 'Parcel delivery' : 'Ride') + ' request sent. A matching approved driver can accept it.');
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  }

  const inputStyle = { width: '100%', padding: '12px 13px', border: '1px solid #dce5dc', borderRadius: 9, font: 'inherit', fontSize: 13, background: '#fff', color: '#263a30' };
  return <section className="services-section" id="mobility-services">
    <div className="section-heading"><div><span className="eyebrow">TWO DIFFERENT DRIVER NETWORKS</span><h2>Delivery or a ride?</h2></div><span className="section-note">Separate services. Separate drivers.</span></div>
    <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:18}}>
      <button type="button" onClick={()=>setMode('food')} style={{display:'flex',alignItems:'center',gap:9,padding:'12px 18px',borderRadius:10,border:'1px solid '+(mode==='food'?'#174d3d':'#e1e8df'),background:mode==='food'?'#edf5ef':'#fff',color:'#204333',fontWeight:700}}><Utensils size={18}/> Food Delivery</button>
      <button type="button" onClick={()=>setMode('ride')} style={{display:'flex',alignItems:'center',gap:9,padding:'12px 18px',borderRadius:10,border:'1px solid '+(mode==='ride'?'#174d3d':'#e1e8df'),background:mode==='ride'?'#edf5ef':'#fff',color:'#204333',fontWeight:700}}><CarFront size={18}/> Ride Service</button>
      <button type="button" onClick={()=>setMode('parcel')} style={{display:'flex',alignItems:'center',gap:9,padding:'12px 18px',borderRadius:10,border:'1px solid '+(mode==='parcel'?'#174d3d':'#e1e8df'),background:mode==='parcel'?'#edf5ef':'#fff',color:'#204333',fontWeight:700}}><PackageCheck size={18}/> Parcel Delivery</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(220px,.55fr)',gap:18,alignItems:'start'}}>
      <form onSubmit={submit} style={{background:'#fff',border:'1px solid #e7ece5',borderRadius:14,padding:20,display:'grid',gap:12}}>
        {mode==='food' ? <>
          <b style={{display:'flex',alignItems:'center',gap:8,color:'#244333'}}><PackageCheck size={18}/> Request a food delivery driver</b><p style={{fontSize:11,color:'#718076',margin:0}}>First place a Food Shops order and wait until the shop accepts it. Then enter that booking ID here.</p>
          <label style={{fontSize:12,fontWeight:600}}>Order reference (if available)<input style={inputStyle} value={form.orderReference} onChange={e=>change('orderReference',e.target.value)} placeholder="Paste your food shop booking ID" required/></label>
          <label style={{fontSize:12,fontWeight:600}}>Restaurant / food shop<input required style={inputStyle} value={form.restaurantName} onChange={e=>change('restaurantName',e.target.value)} placeholder="Restaurant name"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Pickup address<input required style={inputStyle} value={form.pickupAddress} onChange={e=>change('pickupAddress',e.target.value)} placeholder="Restaurant pickup location"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Customer delivery address<input required style={inputStyle} value={form.dropoffAddress} onChange={e=>change('dropoffAddress',e.target.value)} placeholder="Where should the food be delivered?"/></label>
        </> : mode==='parcel' ? <>
          <b style={{display:'flex',alignItems:'center',gap:8,color:'#244333'}}><PackageCheck size={18}/> Send a parcel</b>
          <label style={{fontSize:12,fontWeight:600}}>Pickup address<input required style={inputStyle} value={form.pickup} onChange={e=>change('pickup',e.target.value)} placeholder="Sender pickup address"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Destination address<input required style={inputStyle} value={form.destination} onChange={e=>change('destination',e.target.value)} placeholder="Recipient address"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Sender contact number<input required style={inputStyle} value={form.pickupContact} onChange={e=>change('pickupContact',e.target.value)} placeholder="Sender phone number"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Recipient contact number<input required style={inputStyle} value={form.recipientContact} onChange={e=>change('recipientContact',e.target.value)} placeholder="Recipient phone number"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Parcel type<select style={inputStyle} value={form.parcelType} onChange={e=>change('parcelType',e.target.value)}><option value="document">Document</option><option value="small">Small parcel</option><option value="standard">Standard parcel</option><option value="fragile">Fragile</option></select></label>
          <label style={{fontSize:12,fontWeight:600}}>Weight (kg)<input required type="number" min="0.1" max="100" step="0.1" style={inputStyle} value={form.weightKg} onChange={e=>change('weightKg',e.target.value)}/></label>
        </> : <>
          <b style={{display:'flex',alignItems:'center',gap:8,color:'#244333'}}><Bike size={18}/> Request a ride driver</b>
          <label style={{fontSize:12,fontWeight:600}}>Pickup location<input required style={inputStyle} value={form.pickup} onChange={e=>change('pickup',e.target.value)} placeholder="Where should the driver pick you up?"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Destination<input required style={inputStyle} value={form.destination} onChange={e=>change('destination',e.target.value)} placeholder="Where are you going?"/></label>
          <label style={{fontSize:12,fontWeight:600}}>Passengers<select style={inputStyle} value={form.passengerCount} onChange={e=>change('passengerCount',e.target.value)}><option value="1">1 passenger</option><option value="2">2 passengers</option><option value="3">3 passengers</option><option value="4">4 passengers</option><option value="5">5 passengers</option><option value="6">6 passengers</option></select></label>
        </>}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap',padding:'10px 12px',border:'1px solid #e5ebe3',borderRadius:9,background:'#f8faf7'}}>
          <span style={{fontSize:11,color:'#66756b'}}>{gps ? `GPS added · ±${Math.round(gps.accuracyM || 0)} m` : 'GPS is optional; address entry still works.'}</span>
          <button type="button" onClick={useCurrentLocation} disabled={gpsBusy} style={{border:'1px solid #cbd9cc',borderRadius:8,padding:'8px 10px',background:'#fff',color:'#174d3d',fontWeight:700,fontSize:11}}>{gpsBusy ? 'Getting location…' : gps ? 'Refresh GPS location' : 'Use current GPS location'}</button>
        </div>
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
      {currentUser?.token && <section style={{marginTop:24}}>
        <div className="section-heading"><div><span className="eyebrow">YOUR REQUESTS</span><h2>Ride & delivery status</h2></div><button type="button" onClick={refreshJobs} style={{border:'1px solid #dce5dc',borderRadius:8,padding:'8px 12px',background:'#fff',color:'#174d3d'}}>Refresh</button></div>
        {jobsError && <p role="alert" style={{fontSize:12,color:'#a33'}}>{jobsError}</p>}
        {myJobs.length===0 ? <p style={{fontSize:12,color:'#718076'}}>Your ride and delivery requests will appear here.</p> : myJobs.map(job=><article key={job.id} style={{background:'#fff',border:'1px solid #e5ebe3',borderRadius:12,padding:14,marginBottom:10}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><b style={{fontSize:13,color:'#244333'}}>{job.serviceType==='food_delivery'?'Food delivery':job.serviceType==='parcel_delivery'?'Parcel delivery':'Passenger ride'} · {job.id}</b><span className="status-pill muted">{String(job.status||'requested').replaceAll('_',' ')}</span></div>
          <p style={{fontSize:12,lineHeight:1.7,color:'#657468',margin:'8px 0'}}><b>Pickup:</b> {job.pickupAddress}<br/><b>Drop-off:</b> {job.destinationAddress}</p>
          {job.driverName && <p style={{fontSize:12,color:'#315a42',margin:0}}>Driver: {job.driverName}{job.driverLocation ? ` · latest GPS ${Number(job.driverLocation.lat).toFixed(4)}, ${Number(job.driverLocation.lng).toFixed(4)}` : ' · live location not currently available'}</p>}
          {(job.startPin||job.pickupPin||job.deliveryPin)&&<div style={{marginTop:10,padding:10,borderRadius:8,background:'#f0f7f1',fontSize:12,color:'#24543b'}}><b>Keep these verification PINs private</b>{job.startPin&&<div>Trip start PIN: <b>{job.startPin}</b></div>}{job.pickupPin&&<div>Pickup PIN: <b>{job.pickupPin}</b></div>}{job.deliveryPin&&<div>Delivery PIN: <b>{job.deliveryPin}</b></div>}<small>Share each PIN only at the correct handoff.</small></div>}
          {job.status==='requested' && <button type="button" onClick={()=>cancelRequest(job.id)} style={{marginTop:10,border:'1px solid #e5caca',borderRadius:8,padding:'8px 11px',background:'#fff',color:'#a33',fontSize:11,fontWeight:700}}>Cancel request</button>}
        </article>)}
      </section>}
    </div>
  </section>;
}
