import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { User, LogOut, ArrowRight, Search, ClipboardList, Shield, Briefcase } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onNotice }) {
  const { currentUser, openAuthModal, logout } = useAuth();
  const navigate = useNavigate();

  function handleSignOutClick() {
    logout();
    navigate('/');
    if (onNotice) onNotice('You have been signed out.');
  }

  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="ARY Services home">
        <span className="brand-mark">A</span>
        <span>ARY <b>Services</b></span>
      </Link>

      <nav className="header-nav-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
          <Search size={14} /> Explore
        </NavLink>

        {currentUser && currentUser.accountType === 'customer' && (
          <NavLink to="/bookings" className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
            <ClipboardList size={14} /> My Bookings
          </NavLink>
        )}

        {currentUser && currentUser.accountType === 'provider' && (
          <NavLink to="/provider" className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
            <Briefcase size={14} /> Provider Workspace
          </NavLink>
        )}

        {currentUser && currentUser.accountType === 'admin' && (
          <NavLink to="/admin" className={({ isActive }) => `nav-link-btn ${isActive ? 'active' : ''}`}>
            <Shield size={14} /> Super Admin
          </NavLink>
        )}
      </nav>

      {currentUser ? (
        <div className="user-profile">
          <span className="user-badge">
            <User size={14} />
            <span>{currentUser.fullName}</span>
            <small className="user-role-tag">{currentUser.accountType}</small>
          </span>
          <button className="sign-out-btn" onClick={handleSignOutClick} title="Sign out">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      ) : (
        <button className="sign-in" onClick={() => openAuthModal('login')}>
          Sign in <ArrowRight size={16} />
        </button>
      )}
    </header>
  );
}
