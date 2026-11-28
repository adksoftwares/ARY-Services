import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { API_BASE } from '../config.js';
import { getFriendlyErrorMessage } from '../utils/errorMessage.js';

const AuthContext = createContext(null);

function getStoredUser(key) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const u = JSON.parse(saved);
    if (u && (u.status === 'rejected' || u.status === 'suspended')) {
      localStorage.removeItem(key);
      return null;
    }
    return u;
  } catch {
    return null;
  }
}

function resolvePortalFromPath(pathname = '') {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/driver')) return 'driver';
  if (pathname.startsWith('/provider')) return 'provider';
  return 'customer';
}

export function AuthProvider({ children }) {
  // 1. Detect current browser pathname & active portal
  const [currentPath, setCurrentPath] = useState(() => (typeof window !== 'undefined' ? window.location.pathname : '/'));
  
  useEffect(() => {
    const handleLocationChange = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handleLocationChange);
    const interval = setInterval(() => {
      if (window.location.pathname !== currentPath) {
        setCurrentPath(window.location.pathname);
      }
    }, 150);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, [currentPath]);

  const activePortal = useMemo(() => resolvePortalFromPath(currentPath), [currentPath]);

  // 2. Dedicated Sessions for Customer, Partner Pro, Driver & Super Admin
  const [sessions, setSessions] = useState(() => {
    const legacy = getStoredUser('ary_user');
    return {
      customer: getStoredUser('ary_user_customer') || (legacy?.accountType === 'customer' ? legacy : null),
      provider: getStoredUser('ary_user_provider') || (legacy?.accountType === 'provider' ? legacy : null),
      driver: getStoredUser('ary_user_driver') || (legacy?.accountType === 'driver' ? legacy : null),
      admin: getStoredUser('ary_user_admin') || (legacy?.accountType === 'admin' ? legacy : null)
    };
  });

  // 3. Resolve active currentUser for the currently browsed portal
  const currentUser = useMemo(() => {
    const directMatch = sessions[activePortal];
    if (directMatch) return directMatch;

    // Multi-role fallback checking
    if (activePortal === 'customer') {
      return sessions.customer || sessions.provider || sessions.driver || sessions.admin || null;
    }
    if (activePortal === 'driver') {
      const match = Object.values(sessions).find(u => u && (u.accountType === 'driver' || (Array.isArray(u.roles) && u.roles.includes('driver'))));
      if (match) return match;
    }
    if (activePortal === 'provider') {
      const match = Object.values(sessions).find(u => u && (u.accountType === 'provider' || (Array.isArray(u.roles) && u.roles.includes('provider'))));
      if (match) return match;
    }
    if (activePortal === 'admin') {
      const match = Object.values(sessions).find(u => u && u.accountType === 'admin');
      if (match) return match;
    }

    return null;
  }, [sessions, activePortal]);

  const [role, setRole] = useState(() => {
    if (currentUser) {
      if (currentUser.accountType === 'provider') return 'Provider';
      if (currentUser.accountType === 'driver') return 'Driver';
      if (currentUser.accountType === 'admin') return 'Admin';
      return 'Customer';
    }
    return 'Customer';
  });

  useEffect(() => {
    if (currentUser) {
      if (currentUser.accountType === 'provider') setRole('Provider');
      else if (currentUser.accountType === 'driver') return setRole('Driver');
      else if (currentUser.accountType === 'admin') return setRole('Admin');
      else setRole('Customer');
    } else {
      setRole(activePortal === 'admin' ? 'Admin' : activePortal === 'driver' ? 'Driver' : activePortal === 'provider' ? 'Provider' : 'Customer');
    }
  }, [currentUser, activePortal]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authError, setAuthError] = useState('');
  const [authPortalTarget, setAuthPortalTarget] = useState(null);

  // Sync with cross-tab storage events
  useEffect(() => {
    function syncSharedSession(event) {
      if (!event.key || !event.key.startsWith('ary_user')) return;
      setSessions({
        customer: getStoredUser('ary_user_customer') || (getStoredUser('ary_user')?.accountType === 'customer' ? getStoredUser('ary_user') : null),
        provider: getStoredUser('ary_user_provider') || (getStoredUser('ary_user')?.accountType === 'provider' ? getStoredUser('ary_user') : null),
        driver: getStoredUser('ary_user_driver') || (getStoredUser('ary_user')?.accountType === 'driver' ? getStoredUser('ary_user') : null),
        admin: getStoredUser('ary_user_admin') || (getStoredUser('ary_user')?.accountType === 'admin' ? getStoredUser('ary_user') : null)
      });
    }
    window.addEventListener('storage', syncSharedSession);
    return () => window.removeEventListener('storage', syncSharedSession);
  }, []);

  function persistUser(user, targetPortal = null) {
    if (!user) return;
    const portal = targetPortal || (
      user.accountType === 'admin' ? 'admin' :
      user.accountType === 'driver' ? 'driver' :
      user.accountType === 'provider' ? 'provider' : 'customer'
    );
    try {
      localStorage.setItem(`ary_user_${portal}`, JSON.stringify(user));
      localStorage.setItem('ary_user', JSON.stringify(user));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    setSessions(prev => ({ ...prev, [portal]: user }));
  }

  function logout(portal = null) {
    const target = portal || activePortal;
    try {
      localStorage.removeItem(`ary_user_${target}`);
      if (sessions[target]?.id === getStoredUser('ary_user')?.id) {
        localStorage.removeItem('ary_user');
      }
    } catch {}
    setSessions(prev => ({ ...prev, [target]: null }));
    setRole('Customer');
  }

  function openAuthModal(mode = 'login', targetPortal = null) {
    setAuthMode(mode);
    setAuthError('');
    setAuthPortalTarget(targetPortal || activePortal);
    setIsAuthModalOpen(true);
  }

  function closeAuthModal() {
    setIsAuthModalOpen(false);
    setAuthError('');
    setAuthPortalTarget(null);
  }

  async function sendOtp(phone, shieldToken = null) {
    let token = shieldToken;
    if (!token) {
      try {
        const challengeRes = await fetch(`${API_BASE}/auth/shield/challenge`);
        if (challengeRes.ok) {
          const chData = await challengeRes.json();
          token = chData.token;
        }
      } catch (err) {
        console.warn('Could not fetch security shield challenge token:', err);
      }
    }

    const res = await fetch(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, shieldToken: token })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send OTP code.');
    }
    return data;
  }

  async function verifyOtpAndLogin(phone, otp, fullName = '', location = '', registrationToken = '', targetPortal = null) {
    const res = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, fullName, location, registrationToken })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Verification failed.');
    }
    if (data.user) {
      persistUser(data.user, targetPortal || authPortalTarget || 'customer');
    }
    return data;
  }

  async function login(identifier, password, targetPortal = null) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.accountStatus === 'pending' || (data.error && data.error.includes('pending'))) {
          throw new Error('Account Pending: Your provider application is pending Super Admin approval. Please wait for verification.');
        }
        if (data.accountStatus === 'rejected' || (data.error && data.error.includes('block'))) {
          throw new Error('Account Blocked: This account has been rejected or placed on the block list by administration.');
        }
        throw new Error(data.error || 'Login failed.');
      }

      const boundPortal = targetPortal || authPortalTarget || (
        data.user.accountType === 'admin' ? 'admin' :
        data.user.accountType === 'driver' ? 'driver' :
        data.user.accountType === 'provider' ? 'provider' : 'customer'
      );
      persistUser(data.user, boundPortal);
      return data.user;
    } catch (err) {
      const friendlyMsg = getFriendlyErrorMessage(err, 'Login failed. Please check your credentials.');
      throw new Error(friendlyMsg);
    }
  }

  async function register(userData, targetPortal = null) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }

    if (userData.accountType !== 'provider' && data.user) {
      persistUser(data.user, targetPortal || authPortalTarget || userData.accountType || 'customer');
    }

    return data;
  }

  async function switchRole(nextRole) {
    if (!currentUser?.token) throw new Error('Please sign in first.');
    const res = await fetch(`${API_BASE}/auth/active-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
      body: JSON.stringify({ role: String(nextRole).toLowerCase() })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not switch account role.');
    persistUser(data.user, String(nextRole).toLowerCase());
    setRole(nextRole === 'provider' ? 'Provider' : nextRole === 'driver' ? 'Driver' : 'Customer');
    return data.user;
  }

  async function applyForRole(roleName, details = {}) {
    if (!currentUser?.token) throw new Error('Please sign in first.');
    const res = await fetch(`${API_BASE}/account/role-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser.token}` },
      body: JSON.stringify({ role: String(roleName).toLowerCase(), details })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not submit role application.');
    const updated = { ...currentUser, roleApplications: { ...(currentUser.roleApplications || {}), [roleName]: data.application } };
    persistUser(updated);
    return data;
  }

  async function updateUserLocation(newLocation, newCoords = null) {
    if (!currentUser) return null;
    const cleanLocation = String(newLocation || '').trim();
    if (!cleanLocation) return currentUser;

    const updated = {
      ...currentUser,
      location: cleanLocation,
      ...(newCoords ? { coords: newCoords } : {})
    };
    persistUser(updated);

    if (currentUser?.token) {
      try {
        await fetch(`${API_BASE}/users/location`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({
            location: cleanLocation,
            lat: newCoords?.lat,
            lng: newCoords?.lng
          })
        });
      } catch (err) {
        console.warn('Could not sync user location to server:', err);
      }
    }
    return updated;
  }

  const value = {
    activePortal,
    sessions,
    customerUser: sessions.customer,
    providerUser: sessions.provider,
    driverUser: sessions.driver,
    adminUser: sessions.admin,
    currentUser,
    token: currentUser?.token,
    role,
    setRole,
    isCustomerLoggedIn: Boolean(currentUser),
    isAuthModalOpen,
    setIsAuthModalOpen,
    authMode,
    setAuthMode,
    authError,
    setAuthError,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    switchRole,
    applyForRole,
    sendOtp,
    verifyOtpAndLogin,
    persistUser,
    updateUserLocation,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
