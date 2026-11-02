import React, { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { subscribeToAppEvents } from '../../utils/events';

const EVENTS = [
  'booking:created','booking:status_updated','booking:quote_sent','booking:quote_decided','booking:reschedule_requested','booking:reschedule_decided','driver:job_created','driver:job_updated',
  'driver:application_reviewed','grocery:order_created','grocery:order_updated',
  'review:submitted','user:status_changed'
];

export default function NotificationCenter() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permission, setPermission] = useState(typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported');

  const refresh = useCallback(async () => {
    if (!currentUser?.token) { setItems([]); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/notifications?limit=40`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load notifications.');
      const nextItems = data.notifications || [];
      setItems(previous => {
        if (previous.length && permission === 'granted') {
          const known = new Set(previous.map(item => item.id));
          nextItems.filter(item => !known.has(item.id) && !item.readAt).slice(0, 3).forEach(item => {
            try { new window.Notification(item.title, { body: item.body, tag: item.id }); } catch {}
          });
        }
        return nextItems;
      });
      setError('');
    } catch (err) { setError(err.message || 'Could not load notifications.'); }
    finally { setLoading(false); }
  }, [currentUser?.token, permission]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!currentUser?.token) return undefined;
    const handlers = Object.fromEntries(EVENTS.map(name => [name, refresh]));
    return subscribeToAppEvents(currentUser.token, handlers);
  }, [currentUser?.token, refresh]);

  async function markRead(item) {
    if (item.readAt) return;
    try {
      const response = await fetch(`${API_BASE}/notifications/${encodeURIComponent(item.id)}/read`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (!response.ok) throw new Error('Could not update notification.');
      setItems(old => old.map(entry => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    } catch (err) { setError(err.message); }
  }

  async function markAllRead() {
    try {
      const response = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      if (!response.ok) throw new Error('Could not update notifications.');
      const now = new Date().toISOString();
      setItems(old => old.map(item => ({ ...item, readAt: item.readAt || now })));
    } catch (err) { setError(err.message); }
  }

  if (!currentUser?.token) return null;
  const unread = items.filter(item => !item.readAt).length;
  return <div style={{position:'relative'}}>
    <button type="button" onClick={() => { setOpen(value => !value); if (!open) refresh(); }} aria-label={`Notifications, ${unread} unread`} style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',width:38,height:38,border:'1px solid #dbe5dc',borderRadius:10,background:'#fff',color:'#174d3d',cursor:'pointer'}}>
      <Bell size={17}/>{unread>0&&<span style={{position:'absolute',right:-4,top:-5,minWidth:17,height:17,padding:'0 4px',borderRadius:20,background:'#dc2626',color:'#fff',fontSize:10,fontWeight:700,display:'grid',placeItems:'center'}}>{unread>99?'99+':unread}</span>}
    </button>
    {open&&<div style={{position:'absolute',right:0,top:46,width:'min(360px, calc(100vw - 28px))',maxHeight:430,overflowY:'auto',zIndex:1000,background:'#fff',border:'1px solid #dce5dd',borderRadius:14,boxShadow:'0 16px 40px rgba(15,35,22,.16)',padding:12}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,padding:'4px 2px 10px'}}>
        <strong style={{fontSize:14,color:'#173b2f'}}>Notifications</strong>
        <button type="button" onClick={markAllRead} disabled={!unread} style={{border:0,background:'transparent',color:unread?'#176343':'#94a39a',fontSize:11,fontWeight:700,cursor:unread?'pointer':'default',display:'flex',gap:4,alignItems:'center'}}><CheckCheck size={13}/> Mark all read</button>
      </div>
        {'Notification' in window && permission !== 'granted' && permission !== 'denied' && <button type="button" onClick={async()=>{const next=await window.Notification.requestPermission();setPermission(next);}} style={{width:'100%',padding:'8px',marginBottom:8,border:'1px solid #dbe5dc',borderRadius:8,background:'#f8fbf8',color:'#24543b',fontSize:11,fontWeight:700}}>Enable browser alerts</button>}
        {permission === 'denied' && <p style={{fontSize:11,color:'#8a5b24'}}>Browser alerts are blocked in your browser settings.</p>}
      {error&&<p role="alert" style={{fontSize:12,color:'#b91c1c'}}>{error}</p>}
      {loading?<p style={{fontSize:12,color:'#647368',padding:12}}>Loading…</p>:items.length===0?<p style={{fontSize:12,color:'#647368',padding:12}}>You're all caught up. New booking and order updates will appear here.</p>:items.map(item=><button key={item.id} type="button" onClick={()=>markRead(item)} style={{width:'100%',textAlign:'left',display:'block',padding:'10px 9px',marginTop:4,border:0,borderRadius:9,background:item.readAt?'#fff':'#f0f7f1',cursor:'pointer'}}>
        <span style={{display:'flex',justifyContent:'space-between',gap:8}}><b style={{fontSize:12,color:'#173b2f'}}>{item.title}</b>{!item.readAt&&<span style={{width:7,height:7,borderRadius:'50%',background:'#16804a',flexShrink:0,marginTop:4}}/>}</span>
        <span style={{display:'block',fontSize:11,color:'#53645a',lineHeight:1.5,marginTop:3}}>{item.body}</span>
        <span style={{display:'block',fontSize:10,color:'#8a978e',marginTop:5}}>{new Date(item.createdAt).toLocaleString()}</span>
      </button>)}
    </div>}
  </div>;
}
