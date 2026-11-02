import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Link, useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck } from 'lucide-react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import AdminWorkspace from '../../components/admin/AdminWorkspace';
import AuthModal from '../../components/common/AuthModal';
import Footer from '../../components/common/Footer';
import OfflineBanner from '../../components/common/OfflineBanner';
import { subscribeToAppEvents } from '../../utils/events';
import { ThemeToggle, Button } from '../../design-system';

const initialServices = [
  { id: 1, name: 'Food Shops', slug: 'food-shops', description: 'Explore local shops and place an order', color: 'peach' },
  { id: 2, name: 'Electrical Repair', slug: 'electrical-repair', description: 'Electricians for home and business', color: 'yellow' },
  { id: 3, name: 'Plumbing', slug: 'plumbing', description: 'Repairs, fittings and maintenance', color: 'blue' },
  { id: 4, name: 'Grocery Products', slug: 'grocery-products', description: 'Shop everyday grocery items by weight, volume and pack size', color: 'peach' },
  { id: 5, name: 'Other Services', slug: 'other-services', description: 'Discover more services near you', color: 'lilac' }
];

function AdminPortal() {
  const { currentUser, openAuthModal } = useAuth();
  const [adminUsers, setAdminUsers] = useState([]);
  const [services, setServices] = useState(initialServices);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [notice, setNotice] = useState('');
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
    return subscribeToAppEvents(currentUser?.token, {
      'driver:application_created': refresh,
      'driver:application_reviewed': refresh,
      'user:registered': refresh,
      'user:status_changed': refresh
    });
  }, [isAdmin, fetchAdminUsers, currentUser?.token]);

  return (
    <div className="app-shell" style={{ background: 'var(--color-bg, #fbfaf7)' }}>
      <OfflineBanner />
      {isAdmin ? (
        <AdminWorkspace
          adminUsers={adminUsers}
          setAdminUsers={setAdminUsers}
          services={services}
          setServices={setServices}
          isLoadingUsers={isLoadingUsers}
          fetchAdminUsers={fetchAdminUsers}
          onNotice={setNotice}
        />
      ) : (
        <>
          <header className="topbar">
            <Link to="/" className="brand" aria-label="ARY Services Admin home">
              <span className="brand-mark">A</span><span>ARY <b>Admin</b></span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ThemeToggle />
              <button className="sign-in" onClick={() => openAuthModal('login')}>
                <LogIn size={14}/> Admin sign in
              </button>
            </div>
          </header>

          <main style={{ maxWidth: 840, margin: '56px auto', padding: '0 20px', minHeight: '52vh' }}>
            <section style={{
              background: 'var(--color-surface, #fff)',
              border: '1px solid var(--color-border-subtle, #e5ebe2)',
              borderRadius: 'var(--radius-xl, 20px)',
              padding: '40px 32px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-md, 0 12px 36px rgba(20,45,32,.06))'
            }}>
              <div style={{
                width: 58,
                height: 58,
                borderRadius: 'var(--radius-lg, 16px)',
                background: 'var(--color-brand-50, #edf7ef)',
                color: 'var(--color-brand-600, #174d3d)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 18px'
              }}>
                <ShieldCheck size={30}/>
              </div>
              <p className="eyebrow" style={{ color: 'var(--color-brand-700, #174d3d)', fontWeight: 700, letterSpacing: '0.05em' }}>
                ARY PLATFORM CONTROL
              </p>
              <h1 style={{ color: 'var(--color-brand-900, #173b2f)', margin: '8px 0 12px', fontSize: '1.9rem' }}>
                Super Admin workspace.
              </h1>
              <p style={{ color: 'var(--color-neutral-600, #647368)', maxWidth: 540, margin: '0 auto 24px', lineHeight: 1.7, fontSize: '0.95rem' }}>
                Sign in with your authorized Super Admin account to inspect registered accounts, verify KYC documents, arbitrate customer disputes, and disburse LankaPay CEFT batch payouts.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => openAuthModal('login')}
              >
                <LogIn size={16}/> Sign in as Administrator
              </Button>
            </section>
          </main>
          <Footer />
        </>
      )}

      <AuthModal onNotice={setNotice}/>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice('')} aria-label="Dismiss">×</button>
        </div>
      )}
    </div>
  );
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AdminPortal />
      </BrowserRouter>
    </AuthProvider>
  );
}
