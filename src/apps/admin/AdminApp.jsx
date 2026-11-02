import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogIn, LogOut, ShieldCheck, Users, Bike, UserRound, BriefcaseBusiness } from 'lucide-react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import AdminWorkspace from '../../components/admin/AdminWorkspace';
import DriverApplicationsAdmin from '../../components/admin/DriverApplicationsAdmin';
import RoleApplicationsAdmin from '../../components/admin/RoleApplicationsAdmin';
import ProviderServiceRequestsAdmin from '../../components/admin/ProviderServiceRequestsAdmin';
import AuthModal from '../../components/common/AuthModal';
import Footer from '../../components/common/Footer';
import NotificationCenter from '../../components/common/NotificationCenter';
import { subscribeToAppEvents } from '../../utils/events';

const initialServices = [
  { id: 1, name: 'Food Shops', slug: 'food-shops', description: 'Explore local shops and place an order', color: 'peach' },
  { id: 2, name: 'Electrical Repair', slug: 'electrical-repair', description: 'Electricians for home and business', color: 'yellow' },
  { id: 3, name: 'Plumbing', slug: 'plumbing', description: 'Repairs, fittings and maintenance', color: 'blue' },
  { id: 4, name: 'Grocery Products', slug: 'grocery-products', description: 'Shop everyday grocery items by weight, volume and pack size', color: 'peach' },
  { id: 5, name: 'Other Services', slug: 'other-services', description: 'Discover more services near you', color: 'lilac' }
];

function AdminPortal() {
  const { currentUser, openAuthModal, logout } = useAuth();
  const navigate = useNavigate();
  const [adminUsers, setAdminUsers] = useState([]);
  const [services, setServices] = useState(initialServices);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeSection, setActiveSection] = useState('workspace');
  const isAdmin = currentUser?.accountType === 'admin';

  const fetchAdminUsers = useCallback(async () => {
    if (!currentUser?.token || currentUser.accountType !== 'admin') {
      setAdminUsers([]);
      return;
    }
    setIsLoadingUsers(true);
    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${currentUser.token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not load registered accounts.');
      setAdminUsers(data.users || []);
    } catch (error) {
      setNotice(error.message || 'Could not load registered accounts.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchAdminUsers(); }, [fetchAdminUsers]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const refresh = () => fetchAdminUsers();
    return subscribeToAppEvents(currentUser?.token, { 'driver:application_created': refresh, 'driver:application_reviewed': refresh, 'user:registered': refresh, 'user:status_changed': refresh });
  }, [isAdmin, fetchAdminUsers]);

  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand" aria-label="ARY Services Admin home">
        <span className="brand-mark">A</span><span>ARY <b>Admin</b></span>
      </Link>
      {isAdmin ? <>
        <div className="user-profile"><NotificationCenter/></div>
        <nav className="header-nav-links">
          <button className="nav-link-btn" onClick={() => setActiveSection('workspace')}><LayoutDashboard size={14}/> Admin workspace</button>
          <button className="nav-link-btn" onClick={() => setActiveSection('drivers')}><Bike size={14}/> Driver approvals</button>
          <button className="nav-link-btn" onClick={() => setActiveSection('roles')}><Users size={14}/> Role applications</button>
          <button className="nav-link-btn" onClick={() => setActiveSection('services')}><BriefcaseBusiness size={14}/> Service approvals</button>
        </nav>
        <div className="user-profile">
          <span className="user-badge"><UserRound size={14}/><span>{currentUser.fullName}</span></span>
          <button className="sign-out-btn" onClick={() => { logout(); navigate('/'); }}><LogOut size={14}/> Sign out</button>
        </div>
      </> : <button className="sign-in" onClick={() => openAuthModal('login')}><LogIn size={14}/> Admin sign in</button>}
    </header>

    {isAdmin ? activeSection === 'drivers' ? <DriverApplicationsAdmin/> : activeSection === 'roles' ? <RoleApplicationsAdmin/> : activeSection === 'services' ? <ProviderServiceRequestsAdmin/> : <AdminWorkspace
      adminUsers={adminUsers}
      setAdminUsers={setAdminUsers}
      services={services}
      setServices={setServices}
      isLoadingUsers={isLoadingUsers}
      fetchAdminUsers={fetchAdminUsers}
      onNotice={setNotice}
    /> : <main style={{maxWidth:900,margin:'56px auto',padding:'0 20px',minHeight:'48vh'}}>
      <section style={{background:'#fff',border:'1px solid #e5ebe2',borderRadius:18,padding:'32px',textAlign:'center',boxShadow:'0 12px 36px rgba(20,45,32,.06)'}}>
        <div style={{width:54,height:54,borderRadius:16,background:'#edf7ef',color:'#174d3d',display:'grid',placeItems:'center',margin:'0 auto 16px'}}><ShieldCheck size={26}/></div>
        <p className="eyebrow">ARY PLATFORM CONTROL</p>
        <h1 style={{color:'#173b2f',margin:'8px 0'}}>Super Admin workspace.</h1>
        <p style={{color:'#647368',maxWidth:560,margin:'0 auto 22px',lineHeight:1.7}}>Sign in with your authorized Admin account to manage registered accounts, service categories, provider and driver approvals, disputes and payouts.</p>
        <button className="register-nav-btn" onClick={() => openAuthModal('login')}><LogIn size={15}/> Admin sign in</button>
      </section>
    </main>}

    <AuthModal onNotice={setNotice}/>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    <Footer/>
  </div>;
}

export default function AdminApp() {
  return <AuthProvider><BrowserRouter><AdminPortal/></BrowserRouter></AuthProvider>;
}
