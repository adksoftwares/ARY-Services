import React from 'react';
import { createRoot } from 'react-dom/client';
import CustomerApp from './apps/customer/CustomerApp.jsx';
import './styles.css';
import './design-system/master-rebuild.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><CustomerApp/></React.StrictMode>
);
