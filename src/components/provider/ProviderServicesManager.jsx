import React, { useCallback, useEffect, useState } from 'react';
import { BriefcaseBusiness, RefreshCw, Send } from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAppEvents } from '../../utils/events';

const categories = [
  { slug: 'food-shops', name: 'Food Shops' },
  { slug: 'electrical-repair', name: 'Electrical Repair' },
  { slug: 'plumbing', name: 'Plumbing' },
  { slug: 'grocery-products', name: 'Grocery Products' },
  { slug: 'other-services', name: 'Other Services' }
];

export default function ProviderServicesManager() {
  const { currentUser } = useAuth();
  const [data, setData] = useState({ primaryCategory: {}, approvedServices: [], requests: [] });
  const [categorySlug, setCategorySlug] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [baseCharge, setBaseCharge] = useState('1500');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE}/providers/services/mine`, { headers: { Authorization: `Bearer ${currentUser.token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not load your service approvals.');
      setData(result);
      if (!categorySlug) setCategorySlug(categories.find(item => item.slug !== result.primaryCategory?.categorySlug && !result.approvedServices?.some(service => service.categorySlug === item.slug))?.slug || '');
    } catch (err) { setError(err.message || 'Could not load service approvals.'); }
  }, [currentUser?.token, categorySlug]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!currentUser?.token) return undefined;
    return subscribeToAppEvents(currentUser.token, { 'provider:service_request_reviewed': load });
  }, [currentUser?.token, load]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${API_BASE}/providers/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ categorySlug, serviceName, description, baseCharge: Number(baseCharge) })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not submit service request.');
      setNotice(result.message || 'Service request sent to Admin.');
      setServiceName(''); setDescription('');
      await load();
    } catch (err) { setError(err.message || 'Could not submit service request.'); }
    finally { setBusy(false); }
  }

  const available = categories.filter(item => item.slug !== data.primaryCategory?.categorySlug && !data.approvedServices.some(service => service.categorySlug === item.slug));
  return <section style={{margin:'22px auto',maxWidth:1180,padding:18,border:'1px solid #dce5dc',borderRadius:14,background:'#fff'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
      <div><span style={{fontSize:11,fontWeight:800,letterSpacing:1,color:'#56806a'}}>SERVICE CATALOG</span><h2 style={{margin:'4px 0',fontSize:19,color:'#173b2f'}}><BriefcaseBusiness size={18} style={{verticalAlign:'middle',marginRight:7}}/>Add another service</h2><p style={{margin:0,fontSize:12,color:'#64748b'}}>New service categories appear to customers only after Admin approval.</p></div>
      <button type="button" onClick={load} style={{border:'1px solid #dce5dc',background:'#fff',borderRadius:8,padding:'8px 10px',display:'flex',gap:6,alignItems:'center'}}><RefreshCw size={13}/> Refresh</button>
    </div>
    {error&&<p role="alert" style={{color:'#b91c1c',fontSize:12}}>{error}</p>}
    {notice&&<p role="status" style={{color:'#166534',fontSize:12}}>{notice}</p>}
    <div style={{display:'flex',gap:7,flexWrap:'wrap',margin:'12px 0'}}>
      <span style={{fontSize:11,padding:'6px 9px',background:'#edf7ef',borderRadius:7,color:'#24543b'}}>Primary: {data.primaryCategory?.categoryName || data.primaryCategory?.categorySlug || 'Not set'}</span>
      {data.approvedServices.map(service=><span key={service.id} style={{fontSize:11,padding:'6px 9px',background:'#eff6ff',borderRadius:7,color:'#1d4ed8'}}>{service.serviceName} · Approved</span>)}
    </div>
    {available.length>0&&<form onSubmit={submit} style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:9,alignItems:'end',padding:12,background:'#f8fbf8',borderRadius:10}}>
      <label style={{fontSize:11,fontWeight:700,color:'#53645a'}}>Category<select required value={categorySlug} onChange={event=>setCategorySlug(event.target.value)} style={field}><option value="">Choose category</option>{available.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
      <label style={{fontSize:11,fontWeight:700,color:'#53645a'}}>Service name<input required minLength={2} maxLength={120} value={serviceName} onChange={event=>setServiceName(event.target.value)} placeholder="e.g. Air conditioner repair" style={field}/></label>
      <label style={{fontSize:11,fontWeight:700,color:'#53645a'}}>Starting price (LKR)<input required type="number" min="1" max="10000000" step="1" value={baseCharge} onChange={event=>setBaseCharge(event.target.value)} style={field}/></label>
      <label style={{fontSize:11,fontWeight:700,color:'#53645a',gridColumn:'1 / -1'}}>Service description<textarea required minLength={10} maxLength={1000} rows={2} value={description} onChange={event=>setDescription(event.target.value)} placeholder="Describe the work you can provide, service area and any important conditions." style={{...field,resize:'vertical'}}/></label>
      <button type="submit" disabled={busy||!categorySlug} style={{justifySelf:'start',border:0,borderRadius:8,padding:'10px 14px',background:'#174d3d',color:'#fff',fontWeight:700,display:'flex',gap:7,alignItems:'center'}}><Send size={14}/>{busy?'Sending…':'Submit for Admin approval'}</button>
    </form>}
    {available.length===0&&<p style={{fontSize:12,color:'#64748b'}}>All available service categories are already approved for your account.</p>}
    {data.requests.length>0&&<div style={{marginTop:12}}><b style={{fontSize:12,color:'#334155'}}>Service request history</b>{data.requests.map(request=><div key={request.id} style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',padding:'9px 0',borderBottom:'1px solid #edf1ed'}}><div><b style={{fontSize:12}}>{request.serviceName}</b><div style={{fontSize:11,color:'#64748b'}}>{request.categoryName} · LKR {Number(request.baseCharge).toLocaleString('en-LK')}</div></div><span style={{fontSize:11,fontWeight:700,color:request.status==='approved'?'#166534':request.status==='rejected'?'#b91c1c':'#a16207'}}>{request.status.toUpperCase()}</span></div>)}</div>}
  </section>;
}
const field={display:'block',width:'100%',boxSizing:'border-box',marginTop:5,padding:9,border:'1px solid #d5dfd6',borderRadius:7,background:'#fff',font:'inherit'};
