import React, { useEffect, useState } from 'react';
import { BrowserRouter, Link, useNavigate } from 'react-router-dom';
import { Bike, LogIn, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import { subscribeToAppEvents } from '../../utils/events';
import DriverWorkspace from '../../components/driver/DriverWorkspace';
import AuthModal from '../../components/common/AuthModal';
import Footer from '../../components/common/Footer';

function DriverPortal() {
  const { currentUser, openAuthModal, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const isDriver = currentUser?.accountType === 'driver';

  useEffect(() => {
    if (!isDriver) return undefined;
    const notify = () => setNotice('Your driver activity has changed. Refresh the job list for the latest details.');
    return subscribeToAppEvents(currentUser?.token, { 'driver:job_created': notify, 'driver:job_updated': notify, 'driver:application_reviewed': notify });
  }, [isDriver, currentUser?.id]);

  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand" aria-label="ARY Services Driver home">
        <span className="brand-mark">A</span><span>ARY <b>Driver</b></span>
      </Link>
      <nav className="header-nav-links">
        <span className="nav-link-btn"><Bike size={14}/> Driver workspace</span>
      </nav>
      {isDriver ? <div className="user-profile">
        <span className="user-badge"><UserRound size={14}/><span>{currentUser.fullName}</span></span>
        {(currentUser.roles || []).includes('customer') && <button className="sign-in" onClick={async () => { try { await switchRole('customer'); window.location.href = '/'; } catch (error) { setNotice(error.message); } }}>Customer app</button>}
        <button className="sign-out-btn" onClick={() => { logout(); navigate('/'); }}><LogOut size={14}/> Sign out</button>
      </div> : <button className="sign-in" onClick={() => openAuthModal('login')}><LogIn size={14}/> Driver sign in</button>}
    </header>

    {isDriver ? <DriverWorkspace onNotice={setNotice}/> : <main style={{maxWidth:900,margin:'56px auto',padding:'0 20px',minHeight:'48vh'}}>
      <section style={{background:'#fff',border:'1px solid #e5ebe2',borderRadius:18,padding:'32px',textAlign:'center',boxShadow:'0 12px 36px rgba(20,45,32,.06)'}}>
        <div style={{width:54,height:54,borderRadius:16,background:'#edf7ef',color:'#174d3d',display:'grid',placeItems:'center',margin:'0 auto 16px'}}><ShieldCheck size={26}/></div>
        <p className="eyebrow">ARY DRIVER NETWORK</p>
        <h1 style={{color:'#173b2f',margin:'8px 0'}}>Every journey, connected.</h1>
        <p style={{color:'#647368',maxWidth:560,margin:'0 auto 22px',lineHeight:1.7}}>Sign in with your Driver account to apply for approved service networks, view eligible jobs and update ride or delivery progress. Admin approval is required before accepting jobs.</p>
        <button className="register-nav-btn" onClick={() => openAuthModal('login')}><LogIn size={15}/> Sign in to continue</button>
      </section>
    </main>}

    <AuthModal onNotice={setNotice}/>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    <Footer/>
  </div>;
}

export default function DriverApp() {
  return <AuthProvider><BrowserRouter><DriverPortal/></BrowserRouter></AuthProvider>;
}
