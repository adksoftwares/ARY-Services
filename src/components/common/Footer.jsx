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

      {/* Normal & Clean ADK Software Solutions Signature */}
      <div className="adk-signature-badge">
        <span className="adk-dot"></span>
        <span className="adk-prefix">Softwared by</span>
        <strong className="adk-brand-name">ADK Software Solutions</strong>
      </div>

      <div className="footer-right">
        <span>© {new Date().getFullYear()} ARY Services. All rights reserved.</span>
      </div>
    </footer>
  );
}
