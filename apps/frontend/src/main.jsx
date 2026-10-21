import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { ModalProvider } from './context/ModalContext';
import ErrorBoundary from './components/Routing/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <TenantProvider>
          <ModalProvider>
            <App />
          </ModalProvider>
        </TenantProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);