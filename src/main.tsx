import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './lib/auth';
import AuthGate from './AuthGate';
import { handleGmailRedirectResult } from './lib/gmail';
import './index.css';

// Check if returning from Gmail OAuth redirect (must run before React renders)
handleGmailRedirectResult();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  </React.StrictMode>
);
