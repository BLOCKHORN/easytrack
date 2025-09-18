// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.scss'
import { ModalProvider } from './context/ModalContext'
import { BannerProvider } from './context/BannerContext' // <-- IMPORTANTE

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ModalProvider>
      <BannerProvider>
        <App />
      </BannerProvider>
    </ModalProvider>
  </React.StrictMode>
)
