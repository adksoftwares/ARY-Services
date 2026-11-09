import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../config.js';
import { getFriendlyErrorMessage } from '../utils/errorMessage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ary_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && (u.status === 'rejected' || u.status === 'suspended')) {
          localStorage.removeItem('ary_user');
          return null;
        }
        return u;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [role, setRole] = useState(() => {
    if (currentUser) {
      if (currentUser.accountType === 'provider') return 'Provider';
      if (currentUser.accountType === 'driver') return 'Driver';
      if (currentUser.accountType === 'admin') return 'Admin';
      return 'Customer';
    }
    return 'Customer';
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authError, setAuthError] = useState('');

  // Keep independently opened ARY apps in sync through the shared browser session.
  useEffect(() => {
    function syncSharedSession(event) {
      if (event.key !== 'ary_user') return;
      let nextUser = null;
      if (event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed && !['rejected', 'suspended'].includes(parsed.status)) nextUser = parsed;
        } catch {
          nextUser = null;
        }
      }
      setCurrentUser(nextUser);
      setRole(nextUser?.accountType === 'provider' ? 'Provider' : nextUser?.accountType === 'driver' ? 'Driver' : nextUser?.accountType === 'admin' ? 'Admin' : 'Customer');
      if (!nextUser) setIsAuthModalOpen(false);
    }
    window.addEventListener('storage', syncSharedSession);
    return () => window.removeEventListener('storage', syncSharedSession);
  }, []);

  // Keep role in sync with currentUser
  useEffect(() => {
    if (currentUser) {
      if (currentUser.accountType === 'provider') setRole('Provider');
      else if (currentUser.accountType === 'driver') setRole('Driver');
      else if (currentUser.accountType === 'admin') setRole('Admin');
      else setRole('Customer');
    }
  }, [currentUser]);

  function persistUser(user) {
    setCurrentUser(user);
    try {
      localStorage.setItem('ary_user', JSON.stringify(user));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  function logout() {
    setCurrentUser(null);
    try {
      localStorage.removeItem('ary_user');
    } catch {}
    setRole('Customer');
  }

  function openAuthModal(mode = 'login') {
    setAuthMode(mode);
    setAuthError('');
    setIsAuthModalOpen(true);
  }

  function closeAuthModal() {
    setIsAuthModalOpen(false);
    setAuthError('');
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

  async function verifyOtpAndLogin(phone, otp, fullName = '', location = '', registrationToken = '') {
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
      persistUser(data.user);
    }
    return data;
  }

  async function login(identifier, password) {
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

      persistUser(data.user);
      return data.user;
    } catch (err) {
      const friendlyMsg = getFriendlyErrorMessage(err, 'Login failed. Please check your credentials.');
      throw new Error(friendlyMsg);
    }
  }

  async function register(userData) {
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
      persistUser(data.user);
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
    persistUser(data.user);
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
