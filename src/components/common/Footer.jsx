import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-left">
        <a className="brand footer-brand" href="#" aria-label="ARY Services Home">
          <span className="brand-mark">A</span>
          <span>ARY <b>Services</b></span>
        </a>
        <span className="footer-tagline">Local services, thoughtfully connected.</span>
      </div>

      {/* Stylish ADK Software Solutions Signature Badge */}
      <div className="adk-signature-badge" title="Architected & Developed by ADK Software Solutions">
        <div className="adk-badge-content">
          <span className="adk-dot"></span>
          <span className="adk-prefix">Softwared by</span>
          <strong className="adk-brand-name">
            <span className="adk-brand-gradient">ADK Software Solutions</span>
          </strong>
        </div>
      </div>

      <div className="footer-right">
        <span>© {new Date().getFullYear()} ARY Services. All rights reserved.</span>
      </div>
    </footer>
  );
}
