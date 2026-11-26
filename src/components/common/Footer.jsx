import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ShieldCheck,
  PhoneCall,
  Mail,
  MapPin,
  Heart,
  Globe
} from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer-modern" role="contentinfo">
      {/* Upper Expanded Section */}
      <div className="footer-main-grid">
        {/* Col 1: Brand & Identity */}
        <div className="footer-col footer-col-brand">
          <Link className="brand footer-brand" to="/" aria-label="ARY Services Home">
            <span className="brand-mark">A</span>
            <span>ARY <b>Services</b></span>
          </Link>
          <p className="footer-brand-desc">
            An on-demand service marketplace connecting local service providers, grocery and retail merchants, drivers, and customers across Sri Lanka.
          </p>
          <div className="footer-trust-pills">
            <span className="trust-pill">
              <ShieldCheck size={13} /> Provider applications reviewed
            </span>
            <span className="trust-pill">
              <Globe size={13} /> Service areas shown in listings
            </span>
          </div>
        </div>

        {/* Col 2: Platform Links */}
        <div className="footer-col">
          <h4 className="footer-col-title">Platform Apps</h4>
          <ul className="footer-links-list">
            <li><Link to="/">Customer Marketplace</Link></li>
            <li><Link to="/provider">Provider Workspace</Link></li>
            <li><Link to="/driver-work">Driver Dispatch App</Link></li>
            <li><Link to="/admin">Super Admin Portal</Link></li>
          </ul>
        </div>

        {/* Col 3: Service Hubs */}
        <div className="footer-col">
          <h4 className="footer-col-title">Regional Hubs</h4>
          <ul className="footer-links-list footer-hubs-list">
            <li><span className="hub-dot" /> Colombo & Western</li>
            <li><span className="hub-dot" /> Kandy & Central</li>
            <li><span className="hub-dot" /> Galle & Southern</li>
            <li><span className="hub-dot" /> Jaffna & Northern</li>
            <li><span className="hub-dot" /> Eastern & Suburbs</li>
          </ul>
        </div>

        {/* Col 4: 24/7 Partner & Customer Desk */}
        <div className="footer-col footer-col-support">
          <h4 className="footer-col-title">Support</h4>
          <div className="footer-hotline-card">
            <div className="hotline-icon-box">
              <PhoneCall size={16} />
            </div>
            <div>
              <span className="hotline-sub">Contact ARY Services</span>
              <span className="hotline-number">Support details</span>
            </div>
          </div>
          <div className="footer-email-row">
            <Mail size={13} />
            <span>Contact details will be published here</span>
          </div>
        </div>
      </div>

      {/* Lower Bar: Copyright + Developer Signature */}
      <div className="footer-bottom-bar">
        <div className="footer-copyright">
          <span>&copy; {currentYear} ARY Services. All rights reserved.</span>
        </div>

        {/* Premium ADK Software Solutions Signature Badge */}
        <div className="footer-signature-container">
          <a
            href="https://adksoftwares.com"
            target="_blank"
            rel="noopener noreferrer"
            className="adk-signature-badge-modern"
            title="Visit ADK Software Solutions (adksoftwares.com)"
          >
            <span className="adk-live-dot" />
            <span className="adk-prefix-text">Developed by</span>
            <strong className="adk-brand-text">ADK Software Solutions</strong>
            <ArrowUpRight size={13} className="adk-external-arrow" />
          </a>
        </div>

        <div className="footer-legal-links">
          <span className="footer-safe-badge">ARY Services</span>
          <span>&bull;</span>
          <span>Made for Sri Lanka</span>
        </div>
      </div>
    </footer>
  );
}
