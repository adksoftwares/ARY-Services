import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X, RefreshCw, BriefcaseBusiness } from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAppEvents } from '../../utils/events';

export default function ProviderServiceRequestsAdmin() {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!currentUser?.token || currentUser.accountType !== 'admin') {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/admin/provider-service-requests`, { headers: { Authorization: `Bearer ${currentUser.token}` } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load provider service requests.');
      if (requestId !== requestRef.current) return;
      if (!Array.isArray(data.requests)) throw new Error('The server returned an unexpected service requests list. Please refresh.');
      setRequests(data.requests.filter(item => item && typeof item === 'object' && item.id !== null && item.id !== undefined && item.providerId !== null && item.providerId !== undefined));
    } catch (err) { if (requestId === requestRef.current) setError(err.message || 'Could not load requests.'); }
    finally { if (requestId === requestRef.current) setLoading(false); }
  }, [currentUser?.token, currentUser?.accountType]);

  useEffect(() => {
    load();
    return () => { requestRef.current += 1; };
  }, [load]);
  useEffect(() => {
    if (!currentUser?.token) return undefined;
    return subscribeToAppEvents(currentUser.token, { 'provider:service_request_created': load });
  }, [currentUser?.token, load]);

  async function review(item, status) {
    if (!currentUser?.token || currentUser.accountType !== 'admin' || !item?.id || !item?.providerId || !['approved', 'rejected'].includes(status) || busy) return;
    setBusy(item.id); setError(''); setNotice('');
    try {
      const response = await fetch(`${API_BASE}/admin/provider-service-requests/${encodeURIComponent(item.providerId)}/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not review service request.');
      setNotice(`${item.serviceName || 'Service request'} ${status}.`);
      await load();
    } catch (err) { setError(err.message || 'Could not review request.'); }
    finally { setBusy(''); }
  }

  return <main style={{maxWidth:1100,margin:'34px auto',padding:'0 18px',minHeight:'60vh'}}>
    <span className="eyebrow">ADMIN CONTROL</span>
    <h1 style={{fontSize:34,margin:'6px 0 4px'}}>Provider service approvals.</h1>
    <p style={{fontSize:13,color:'#64748b',marginTop:0}}>Approve each additional service before it appears in customer search and booking.</p>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,margin:'18px 0'}}>
      <b style={{fontSize:13,color:'#334155'}}>{requests.length} pending request{requests.length===1?'':'s'}</b>
      <button type="button" onClick={load} disabled={loading} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 11px',border:'1px solid #dce5dc',borderRadius:8,background:'#fff'}}><RefreshCw size={13}/> Refresh</button>
    </div>
    {error&&<p role="alert" style={{padding:10,background:'#fef2f2',color:'#b91c1c',borderRadius:8,fontSize:12}}>{error}</p>}
    {notice&&<p role="status" style={{padding:10,background:'#f0fdf4',color:'#166534',borderRadius:8,fontSize:12}}>{notice}</p>}
    {loading?<p>Loading service requests…</p>:requests.length===0?<div style={{padding:30,textAlign:'center',background:'#f8faf8',borderRadius:12,color:'#64748b'}}><BriefcaseBusiness size={28}/><p>No pending additional service requests.</p></div>:<div style={{display:'grid',gap:12}}>{requests.map(item=><article key={item.id} style={{padding:16,border:'1px solid #e2e8f0',borderRadius:12,background:'#fff'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div><span style={{fontSize:10,fontWeight:800,letterSpacing:1,color:'#56806a'}}>{item.categoryName}</span><h3 style={{margin:'4px 0',fontSize:18,color:'#173b2f'}}>{item.serviceName}</h3><p style={{fontSize:12,color:'#64748b',margin:'4px 0'}}>Provider: <b>{item.providerName}</b> · {item.providerLocation||'Address not provided'}</p></div><b style={{fontSize:16,color:'#174d3d'}}>{item.baseCharge !== null && item.baseCharge !== undefined && item.baseCharge !== '' && Number.isFinite(Number(item.baseCharge)) && Number(item.baseCharge) >= 0 ? `LKR ${Number(item.baseCharge).toLocaleString('en-LK')}` : 'Rate not provided'}</b></div>
      <p style={{fontSize:13,color:'#475569',lineHeight:1.6,margin:'10px 0'}}>{item.description || 'No additional description provided.'}</p>
      <small style={{color:'#94a3b8'}}>Requested {item.requestedAt && Number.isFinite(new Date(item.requestedAt).getTime()) ? new Date(item.requestedAt).toLocaleString() : 'Date unavailable'}</small>
      <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
        <button type="button" disabled={busy===item.id} onClick={()=>review(item,'approved')} style={{display:'flex',alignItems:'center',gap:6,border:0,borderRadius:8,padding:'9px 13px',background:'#174d3d',color:'#fff',fontWeight:700}}><Check size={14}/> Approve service</button>
        <button type="button" disabled={busy===item.id} onClick={()=>review(item,'rejected')} style={{display:'flex',alignItems:'center',gap:6,border:'1px solid #fecaca',borderRadius:8,padding:'9px 13px',background:'#fff',color:'#b91c1c',fontWeight:700}}><X size={14}/> Reject</button>
      </div>
    </article>)}</div>}
  </main>;
}
