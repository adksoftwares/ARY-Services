import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Link, useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, LogIn, LogOut, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { AuthProvider, useAuth } from '../../../src/context/AuthContext';
import { API_BASE } from '../../../src/config';
import { subscribeToAppEvents } from '../../../src/utils/events';
import ProviderDashboard from '../../../src/components/provider/ProviderDashboard';
import AuthModal from '../../../src/components/common/AuthModal';
import Footer from '../../../src/components/common/Footer';
import NotificationCenter from '../../../src/components/common/NotificationCenter';
import ProviderServicesManager from '../../../src/components/provider/ProviderServicesManager';

function ProviderWorkspace() {
  const { currentUser, openAuthModal, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const fetchBookings = useCallback(async () => {
    if (!currentUser?.token || currentUser.accountType !== 'provider') {
      setBookings([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/bookings`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load provider bookings.');
      setBookings(data.bookings || []);
    } catch (error) {
      setNotice(error.message || 'Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => {
    if (!currentUser || currentUser.accountType !== 'provider') return undefined;
    const refresh = () => fetchBookings();
    return subscribeToAppEvents(currentUser?.token, { 'booking:created': refresh, 'booking:status_updated': refresh, 'booking:quote_sent': refresh, 'booking:quote_decided': refresh, 'booking:reschedule_requested': refresh, 'booking:reschedule_decided': refresh, 'grocery:order_created': refresh, 'grocery:order_updated': refresh, 'driver:job_updated': refresh });
  }, [currentUser, fetchBookings]);

  async function updateBookingStatus(bookingId, status) {
    if (!currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update booking status.');
      setNotice(`Booking status updated to ${status.replaceAll('_', ' ')}.`);
      await fetchBookings();
    } catch (error) {
      setNotice(error.message || 'Could not update booking status.');
    }
  }

  async function decideReschedule(bookingId, decision) {
    if (!currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE}/bookings/${encodeURIComponent(bookingId)}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
        body: JSON.stringify({ decision })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not update reschedule request.');
      setNotice(data.message || 'Reschedule request updated.');
      await fetchBookings();
    } catch (error) { setNotice(error.message || 'Could not update reschedule request.'); }
  }

  const isProvider = currentUser?.accountType === 'provider';

  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand" aria-label="ARY Services Provider home">
        <span className="brand-mark">A</span><span>ARY <b>Provider</b></span>
      </Link>
      <nav className="header-nav-links">
        <span className="nav-link-btn"><BriefcaseBusiness size={14}/> Provider workspace</span>
      </nav>
      {isProvider ? <div className="user-profile">
        <NotificationCenter/>
        <span className="user-badge"><UserRound size={14}/><span>{currentUser.fullName}</span></span>
        {(currentUser.roles || []).includes('customer') && <button className="sign-in" onClick={async () => { try { await switchRole('customer'); window.location.href = '/'; } catch (error) { setNotice(error.message); } }}>Customer app</button>}
        <button className="sign-out-btn" onClick={() => { logout(); navigate('/'); }}><LogOut size={14}/> Sign out</button>
      </div> : <button className="sign-in" onClick={() => openAuthModal('login')}><LogIn size={14}/> Provider sign in</button>}
    </header>

    {isProvider ? <><ProviderServicesManager/><ProviderDashboard
      bookings={bookings}
      isLoading={loading}
      onRefresh={fetchBookings}
      onUpdateStatus={updateBookingStatus}
      onDecideReschedule={decideReschedule}
    /></> : <main style={{maxWidth:900,margin:'56px auto',padding:'0 20px',minHeight:'48vh'}}>
      <section style={{background:'#fff',border:'1px solid #e5ebe2',borderRadius:18,padding:'32px',textAlign:'center',boxShadow:'0 12px 36px rgba(20,45,32,.06)'}}>
        <div style={{width:54,height:54,borderRadius:16,background:'#edf7ef',color:'#174d3d',display:'grid',placeItems:'center',margin:'0 auto 16px'}}><ShieldCheck size={26}/></div>
        <p className="eyebrow">ARY SERVICE PARTNER PORTAL</p>
        <h1 style={{color:'#173b2f',margin:'8px 0'}}>Your business, one workspace.</h1>
        <p style={{color:'#647368',maxWidth:560,margin:'0 auto 22px',lineHeight:1.7}}>Sign in with your approved Service Provider account to manage bookings, customer reviews, earnings and grocery inventory. New provider applications still require Admin approval.</p>
        <button className="register-nav-btn" onClick={() => openAuthModal('login')}><LogIn size={15}/> Sign in to continue</button>
      </section>
    </main>}

    <AuthModal onNotice={setNotice}/>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    <Footer/>
  </div>;
}

export default function ProviderApp() {
  return <AuthProvider><BrowserRouter><ProviderWorkspace/></BrowserRouter></AuthProvider>;
}
