import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import { ModalProvider } from './context/ModalContext';
import { TenantProvider } from './context/TenantContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TenantProvider>
      <ModalProvider>
        <App />
      </ModalProvider>
    </TenantProvider>
  </React.StrictMode>
);