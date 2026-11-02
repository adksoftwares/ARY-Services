import React from 'react';
import { createRoot } from 'react-dom/client';
import CustomerApp from '../../../src/apps/customer/CustomerApp.jsx';
import '../../../src/styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CustomerApp />
  </React.StrictMode>
);
