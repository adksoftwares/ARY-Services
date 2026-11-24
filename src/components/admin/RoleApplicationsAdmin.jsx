import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';

export default function RoleApplicationsAdmin() {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    if (!currentUser?.token || currentUser.accountType !== 'admin') {
      setApplications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotice('');
    try {
      const response = await fetch(`${API_BASE}/admin/role-applications`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load role applications.');
      if (requestId !== requestRef.current) return;
      if (!Array.isArray(data.applications)) throw new Error('The server returned an unexpected applications list. Please refresh.');
      setApplications(data.applications.filter(item => item && typeof item === 'object' && item.userId !== null && item.userId !== undefined && ['provider', 'driver'].includes(item.role)));
    } catch (error) {
      if (requestId === requestRef.current) setNotice(error.message || 'Could not load role applications.');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
    return () => { requestRef.current += 1; };
  }, [load]);

  async function decide(item, status) {
    if (!currentUser?.token || !item || item.userId === null || item.userId === undefined || !['provider', 'driver'].includes(item.role) || !['approved', 'rejected'].includes(status) || busyId) return;
    const key = `${item.userId}:${item.role}`;
    setBusyId(key);
    try {
      const response = await fetch(`${API_BASE}/admin/role-applications/${encodeURIComponent(item.userId)}/${item.role}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update application.');
      setNotice(`${item.role === 'provider' ? 'Provider' : 'Driver'} role ${status}.`);
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusyId('');
    }
  }

  return <main style={{maxWidth:1100,margin:'28px auto',padding:'0 20px',minHeight:'48vh'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:20}}>
      <div><p className="eyebrow">ACCOUNT ACCESS CONTROL</p><h1 style={{color:'#173b2f',margin:'6px 0'}}>Additional role applications</h1><p style={{color:'#647368',margin:0}}>Review Provider and Driver role requests separately from the user's existing Customer account.</p></div>
      <button className="sign-in" onClick={load} disabled={loading}><RefreshCw size={14}/> Refresh</button>
    </div>
    {notice && <p role="status" style={{padding:12,background:'#f0f7f3',borderRadius:8,color:'#174d3d'}}>{notice}</p>}
    {loading ? <p>Loading applications…</p> : applications.length === 0 ? <section style={{padding:28,textAlign:'center',background:'#fff',border:'1px solid #e5ebe2',borderRadius:14,color:'#647368'}}><ShieldCheck size={26}/><p>No pending additional role applications.</p></section> :
      <div style={{display:'grid',gap:14}}>{applications.map(item => <article key={`${item.userId}-${item.role}`} style={{background:'#fff',border:'1px solid #e5ebe2',borderRadius:14,padding:18,display:'grid',gap:10}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><b style={{color:'#173b2f'}}>{item.fullName || 'Name unavailable'}</b><p style={{margin:'4px 0',color:'#647368',fontSize:13}}>{item.phone || 'Phone unavailable'} · {item.email || 'No email'} · {String(item.role).toUpperCase()}</p></div><span style={{fontSize:12,fontWeight:700,color:'#8a5a12'}}>PENDING REVIEW</span></div>
        {item.role === 'provider' ? <div style={{fontSize:13,color:'#42564a',lineHeight:1.7}}>Category: {item.application?.details?.categoryName || item.application?.details?.category || 'Not provided'}<br/>Service area: {item.application?.details?.location || 'Not provided'}<br/>Operating mode: {item.application?.details?.operatingMode || 'Not provided'}<br/>NIC: {item.application?.details?.nicNumber || 'Not provided'}<br/>NSN: {item.application?.details?.nsnNumber || 'Not provided'}</div> : <p style={{fontSize:13,color:'#42564a',margin:0}}>Driver services: {Array.isArray(item.application?.details?.driverServices) ? item.application.details.driverServices.filter(Boolean).join(', ') || 'Not provided' : 'Not provided'}</p>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button className="sign-in" disabled={busyId===`${item.userId}:${item.role}`} onClick={()=>decide(item,'rejected')}><X size={14}/> Reject</button><button className="register-nav-btn" disabled={busyId===`${item.userId}:${item.role}`} onClick={()=>decide(item,'approved')}><Check size={14}/> Approve role</button></div>
      </article>)}</div>}
  </main>;
}
