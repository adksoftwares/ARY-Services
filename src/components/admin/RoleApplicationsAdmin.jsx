import React, { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { API_BASE } from '../../config';
import { useAuth } from '../../context/AuthContext';

export default function RoleApplicationsAdmin() {
  const { currentUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!currentUser?.token || currentUser.accountType !== 'admin') return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/role-applications`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load role applications.');
      setApplications(data.applications || []);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { load(); }, [load]);

  async function decide(item, status) {
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
        <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><b style={{color:'#173b2f'}}>{item.fullName}</b><p style={{margin:'4px 0',color:'#647368',fontSize:13}}>{item.phone} · {item.email || 'No email'} · {item.role.toUpperCase()}</p></div><span style={{fontSize:12,fontWeight:700,color:'#8a5a12'}}>PENDING REVIEW</span></div>
        {item.role === 'provider' ? <div style={{fontSize:13,color:'#42564a',lineHeight:1.7}}>Category: {item.application.details?.categoryName || item.application.details?.category}<br/>Service area: {item.application.details?.location}<br/>Operating mode: {item.application.details?.operatingMode}<br/>NIC: {item.application.details?.nicNumber}<br/>NSN: {item.application.details?.nsnNumber || 'Not provided'}</div> : <p style={{fontSize:13,color:'#42564a',margin:0}}>Driver services: {(item.application.details?.driverServices || []).join(', ')}</p>}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><button className="sign-in" disabled={busyId===`${item.userId}:${item.role}`} onClick={()=>decide(item,'rejected')}><X size={14}/> Reject</button><button className="register-nav-btn" disabled={busyId===`${item.userId}:${item.role}`} onClick={()=>decide(item,'approved')}><Check size={14}/> Approve role</button></div>
      </article>)}</div>}
  </main>;
}
