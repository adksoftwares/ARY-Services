import React from 'react';
import { createRoot } from 'react-dom/client';
import DriverApp from '../../../src/apps/driver/DriverApp.jsx';
import '../../../src/styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DriverApp />
  </React.StrictMode>
);
