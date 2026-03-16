import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/tailwind.css';

/**
 * SECURITY: HTTPS Enforcement
 * In production, ensure all traffic is encrypted via HTTPS
 * Prevent accidental HTTP access to the admin panel
 */
if (import.meta.env.PROD) {
  if (window.location.protocol !== 'https:') {
    // Redirect HTTP to HTTPS in production
    window.location.href = 'https:' + window.location.href.substring(5);
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
