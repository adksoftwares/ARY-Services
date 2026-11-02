import React from 'react';
import { createRoot } from 'react-dom/client';
import ProviderApp from './ProviderApp.jsx';
import '../../../src/styles.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><ProviderApp/></React.StrictMode>);
