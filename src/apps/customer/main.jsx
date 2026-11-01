import React from 'react';
import { createRoot } from 'react-dom/client';
import CustomerApp from './CustomerApp.jsx';
import '../../styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><CustomerApp/></React.StrictMode>
);
