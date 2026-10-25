import React from 'react';

export default function Footer() {
  return (
    <footer>
      <a className="brand footer-brand" href="#">
        <span className="brand-mark">A</span>
        <span>ARY <b>Services</b></span>
      </a>
      <span>Local services, thoughtfully connected.</span>
      <span>© {new Date().getFullYear()} ARY Services</span>
    </footer>
  );
}
